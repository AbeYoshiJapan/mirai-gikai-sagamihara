import { decodeEntities, htmlToLines, normalizeText, stripTags } from "./html-text";

/**
 * 議会サイト（相模原市議会）のトップページにある「カレンダー」を読む。
 *
 * カレンダーは月ごとの表で、日付のマスに会議の略称（「本会議」「議運」「総務」など）が
 * 詳細ページ（/doc-calendar/<id>/）へのリンクとして入っている。祝日は文字だけでリンクがない。
 * 前後の月の日付も同じ表に並ぶ（11 月の表の最後の行に 12/1〜12/5 など）ので、
 * 日付の並びから月を決める。
 *
 * ここで読めたものは「仮の取得」。運営者が確認して公開するまで公開サイトには出さない。
 */

export type SiteCalendarEntry = {
  /** YYYY-MM-DD */
  date: string;
  /** カレンダーの表記（略称）。例: 議運 */
  label: string;
  /** 詳細ページの URL（絶対 URL） */
  url: string;
};

const TABLE_RE = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
const CELL_RE = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
const LINK_RE = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
/** 「2026年11月」（「2026年9月30日」のような日付は除く） */
const YEAR_MONTH_RE = /(\d{4})\s*年\s*(\d{1,2})\s*月(?!\s*\d{1,2}\s*日)/g;
/** 会議の詳細ページへのリンク */
const MEETING_LINK_RE = /doc-calendar/i;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftMonth(
  year: number,
  month: number,
  offset: number
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** マスの日付（リンクの文字を除いた最初の数字）。無ければ null */
function dayNumberOf(cellHtml: string): number | null {
  const text = stripTags(cellHtml.replace(LINK_RE, " "));
  const match = text.match(/(?:^|\D)(\d{1,2})(?!\d)/);
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
}

/** 表の見出し（「2026年11月」）か、表の直前の見出しから年月を読む */
function detectYearMonth(
  html: string,
  tableStart: number,
  table: string
): { year: number; month: number } | null {
  // 表の中（caption）を優先し、無ければ表の直前でいちばん近い見出し
  const own = [...stripTags(table).matchAll(YEAR_MONTH_RE)][0];
  const before = [
    ...htmlToLines(html.slice(Math.max(0, tableStart - 400), tableStart))
      .join(" ")
      .matchAll(YEAR_MONTH_RE),
  ].at(-1);
  const found = own ?? before;
  if (!found) return null;
  const month = Number(found[2]);
  return month >= 1 && month <= 12 ? { year: Number(found[1]), month } : null;
}

/**
 * カレンダーの HTML から、会議の日付・略称・詳細ページの URL を取り出す。
 *
 * @param html 月のページ（例: https://www.sagamihara-shigikai.jp/top/2026/11/）
 * @param options.year / options.month 表に年月が書かれていないときに使う年月（ページの URL の年月）
 * @param options.baseUrl 相対リンクを絶対 URL にするための基準
 */
export function parseSiteCalendarHtml(
  html: string,
  options: { year: number; month: number; baseUrl: string }
): SiteCalendarEntry[] {
  const entries: SiteCalendarEntry[] = [];
  const seen = new Set<string>();

  for (const tableMatch of html.matchAll(TABLE_RE)) {
    const table = tableMatch[0];
    if (!MEETING_LINK_RE.test(table)) continue;

    const base = detectYearMonth(html, tableMatch.index ?? 0, table) ?? {
      year: options.year,
      month: options.month,
    };
    // 表の先頭に前の月の末（26〜31 日など）が並ぶときは -1 から始め、日付が戻るたびに次の月へ
    let offset: number | null = null;
    let previousDay = 0;

    for (const cellMatch of table.matchAll(CELL_RE)) {
      const cell = cellMatch[1];
      const day = dayNumberOf(cell);
      if (day === null) continue;
      if (offset === null) offset = day > 7 ? -1 : 0;
      else if (day < previousDay) offset += 1;
      previousDay = day;

      const { year, month } = shiftMonth(base.year, base.month, offset);
      if (day > daysInMonth(year, month)) continue;
      const date = `${year}-${pad2(month)}-${pad2(day)}`;

      for (const linkMatch of cell.matchAll(LINK_RE)) {
        const href = decodeEntities(linkMatch[2]).trim();
        if (!MEETING_LINK_RE.test(href)) continue;
        const label = normalizeText(stripTags(linkMatch[3]));
        if (!label) continue;
        let url: string;
        try {
          url = new URL(href, options.baseUrl).toString();
        } catch {
          continue;
        }
        const key = `${date}|${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ date, label, url });
      }
    }
  }

  return entries;
}

/** 月のページの URL を作る。`{yyyy}` `{mm}` `{m}` を差し込む */
export function buildCalendarMonthUrl(
  template: string,
  year: number,
  month: number
): string {
  return template
    .replaceAll("{yyyy}", String(year))
    .replaceAll("{mm}", pad2(month))
    .replaceAll("{m}", String(month));
}

/**
 * 取得する月の一覧。今月から `count` か月分（月またぎの会議を拾うため、既定は 3 か月）。
 */
export function calendarMonthsFrom(
  today: string,
  count = 3
): { year: number; month: number }[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => shiftMonth(year, month, i));
}

/** 取得した月の範囲（最初の月の 1 日〜最後の月の末日） */
export function calendarRangeOf(months: { year: number; month: number }[]): {
  from: string;
  to: string;
} {
  const first = months[0];
  const last = months[months.length - 1];
  return {
    from: `${first.year}-${pad2(first.month)}-01`,
    to: `${last.year}-${pad2(last.month)}-${pad2(daysInMonth(last.year, last.month))}`,
  };
}

/**
 * 同じ会議（詳細ページの URL が同じ）がいくつかの日・月の表に出てくるときは 1 件にまとめ、
 * 最初の日を開催日、最後の日を終了日にする（管外行政調査など複数日にわたる会議）。
 */
export function groupCalendarEntries(entries: SiteCalendarEntry[]): {
  url: string;
  label: string;
  date: string;
  endDate: string | null;
}[] {
  const byUrl = new Map<string, { label: string; dates: string[] }>();
  for (const entry of entries) {
    const group = byUrl.get(entry.url) ?? { label: entry.label, dates: [] };
    if (!group.dates.includes(entry.date)) group.dates.push(entry.date);
    byUrl.set(entry.url, group);
  }
  return [...byUrl.entries()]
    .map(([url, group]) => {
      const dates = [...group.dates].sort();
      const last = dates[dates.length - 1];
      return {
        url,
        label: group.label,
        date: dates[0],
        endDate: last !== dates[0] ? last : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.url.localeCompare(b.url));
}
