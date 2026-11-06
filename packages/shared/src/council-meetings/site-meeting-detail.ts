import { htmlToLines, normalizeText, stripTags } from "./html-text";

/**
 * 議会サイトのカレンダーの詳細ページ（/doc-calendar/<id>/）から、
 * 会議名・開催日・開始時刻・場所を「読めれば」読む。
 *
 * ページの書き方は決まっていないので、見出しと「日時」「場所」などの言葉を手がかりにする。
 * 読めなかった項目は null。いずれも仮の値で、運営者が確認して直す。
 */

export type SiteMeetingDetail = {
  /** ページの見出し（会議名らしいときだけ） */
  title: string | null;
  /** 「日時」「開催日」などの見出しのある日付（更新日などは読まない） */
  date: string | null;
  /** 開始時刻。サイトの書き方のまま（例: 午前10時） */
  startTime: string | null;
  place: string | null;
};

const HEADING_RE = /<h([12])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const MEETING_NAME_RE = /(会議|委員会|協議会|審査会|本会議|分科会)/;
const DATE_LABEL_RE = /(日時|開催日|日にち|期日|月日)/;
/** 「場所：本会議場」「場所　第1委員会室」。「会場は〜」のような文は見出しとみなさない */
const PLACE_LABEL_RE = /^(?:場所|会場|開催場所)(?:\s*[:：]\s*|\s+)(.+)$/;
const ROOM_RE =
  /(本会議場|議場|第[0-9一二三四五六七八九]+委員会室|全員協議会室|議会会議室|[^\s、。・]{1,10}会議室|[^\s、。・]{1,10}委員会室)/;
const TIME_RE =
  /((?:午前|午後)\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分|半)?|\d{1,2}\s*時\s*\d{1,2}\s*分|\d{1,2}\s*時(?!間)|\d{1,2}:\d{2})/;
const DATE_RE = /(\d{4}|令和\s*(?:\d{1,2}|元))\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/;
/** 会議の日付と取り違えやすい行（掲載日・更新日など） */
const NOT_MEETING_DATE_RE = /(更新|掲載|公開|作成|登録)/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(match: RegExpMatchArray): string | null {
  const era = match[1].replace(/\s/g, "");
  const year = era.startsWith("令和")
    ? 2018 + (era === "令和元" ? 1 : Number(era.slice(2)))
    : Number(era);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function compactTime(time: string): string {
  return time.replace(/\s+/g, "");
}

/** 見出し（h1・h2）か <title> から、会議名らしいものを選ぶ */
function pickTitle(html: string): string | null {
  const candidates = [...html.matchAll(HEADING_RE)].map((m) => stripTags(m[2]));
  const fromTitle = html.match(TITLE_RE);
  if (fromTitle) {
    // 「総務委員会 | 相模原市議会」のような書き方の先頭
    candidates.push(stripTags(fromTitle[1]).split(/\s*[|｜]\s*/)[0] ?? "");
  }
  const title = candidates.find(
    (c) => c.length > 0 && c.length <= 60 && MEETING_NAME_RE.test(c)
  );
  return title ? normalizeText(title) : null;
}

export function parseSiteMeetingDetailHtml(html: string): SiteMeetingDetail {
  const lines = htmlToLines(html);

  let date: string | null = null;
  let startTime: string | null = null;
  let place: string | null = null;

  for (const [index, line] of lines.entries()) {
    if (NOT_MEETING_DATE_RE.test(line)) continue;

    // 「日時：令和8年11月17日（火曜日）午前10時」のように、見出しと同じ行か次の行にある
    if (DATE_LABEL_RE.test(line)) {
      const nearby = `${line} ${lines[index + 1] ?? ""}`;
      if (!date) {
        const dateMatch = nearby.match(DATE_RE);
        if (dateMatch) date = toIsoDate(dateMatch);
      }
      if (!startTime) {
        const afterDate = nearby.replace(DATE_RE, " ");
        const timeMatch = afterDate.match(TIME_RE);
        if (timeMatch) startTime = compactTime(timeMatch[1]);
      }
    }

    if (!place) {
      const labeled = line.match(PLACE_LABEL_RE);
      if (labeled) {
        place = labeled[1].trim() || (lines[index + 1] ?? null);
      }
    }
  }

  // 「開会」「開始」とだけ書かれている時刻
  if (!startTime) {
    const timeLine = lines.find(
      (line) =>
        /(開会|開始|時間)/.test(line) &&
        !NOT_MEETING_DATE_RE.test(line) &&
        TIME_RE.test(line.replace(DATE_RE, " "))
    );
    const timeMatch = timeLine?.replace(DATE_RE, " ").match(TIME_RE);
    if (timeMatch) startTime = compactTime(timeMatch[1]);
  }

  // 「場所」の見出しがなければ、部屋の名前らしいものを拾う
  if (!place) {
    for (const line of lines) {
      const room = line.match(ROOM_RE);
      if (room) {
        place = room[1];
        break;
      }
    }
  }

  return {
    title: pickTitle(html),
    date,
    startTime,
    place: place ? normalizeText(place).slice(0, 60) : null,
  };
}
