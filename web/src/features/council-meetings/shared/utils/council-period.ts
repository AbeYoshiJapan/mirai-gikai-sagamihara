import type { CouncilMeeting, CouncilPeriod } from "../types";

/**
 * 通年議会では会期（議会年度）の中に本会議を開く「議会期間」（○月議会・○月定例会議）が
 * 複数ある。会議名の「本会議（○月議会初日）」「本会議（○月議会最終日）」から期間を求める。
 * 招集議会・緊急議会・臨時会は、その日だけの議会期間とする。
 * 会議名の書式は取込アダプタが揃える（本会議（○月議会初日）の形）。
 */
export function extractCouncilPeriods(
  meetings: Pick<CouncilMeeting, "name" | "meeting_date" | "category">[]
): CouncilPeriod[] {
  const starts = new Map<string, string>();
  const ends = new Map<string, string>();
  for (const m of meetings) {
    if (m.category !== "plenary") continue;
    const matched = /（(.+議会)(初日|最終日)）/.exec(m.name);
    if (matched) {
      (matched[2] === "初日" ? starts : ends).set(matched[1], m.meeting_date);
      continue;
    }
    // 招集議会・緊急議会・臨時会は1日だけの議会期間として扱う
    const oneDay = /（(招集議会|.+緊急議会|.+臨時会)）/.exec(m.name);
    if (oneDay) {
      starts.set(oneDay[1], m.meeting_date);
      ends.set(oneDay[1], m.meeting_date);
    }
  }
  const periods: CouncilPeriod[] = [];
  for (const [name, start_date] of starts) {
    const end_date = ends.get(name);
    if (end_date) periods.push({ name, start_date, end_date });
  }
  return periods.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/**
 * 使う議会期間を決める。会期管理で入力した期間（diet_sessions.meeting_periods）があれば
 * それを使い、無ければ会議予定の本会議名から導く。
 * 相模原市議会の会議日程は「本会議（○月議会初日）」の形ではないので、通常は入力した期間を使う。
 */
export function resolveCouncilPeriods(
  configured: CouncilPeriod[],
  meetings: Pick<CouncilMeeting, "name" | "meeting_date" | "category">[]
): CouncilPeriod[] {
  if (configured.length > 0) {
    return [...configured].sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
  }
  return extractCouncilPeriods(meetings);
}

/** 日付を `YYYY-MM-DD` にする。日本時間の Date を渡す前提。 */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 議会年度の開始年。開始月はサイト設定（council.year_start_month）。既定は 5 月始まり。 */
export function councilYearOf(date: Date, startMonth = 5): number {
  return date.getMonth() + 1 >= startMonth
    ? date.getFullYear()
    : date.getFullYear() - 1;
}

/** 例：2026 → 令和8年度 */
export function formatCouncilYear(year: number): string {
  return `令和${year - 2018}年度`;
}

export type CouncilStatus = {
  councilYear: number;
  /** 今日を含む議会期間。議会期間外なら null。 */
  currentPeriod: CouncilPeriod | null;
  /** 今日より後に始まる最初の議会期間。 */
  nextPeriod: CouncilPeriod | null;
};

export function getCouncilStatus(
  periods: CouncilPeriod[],
  today: string,
  councilYear: number
): CouncilStatus {
  return {
    councilYear,
    currentPeriod:
      periods.find((p) => p.start_date <= today && today <= p.end_date) ?? null,
    nextPeriod: periods.find((p) => p.start_date > today) ?? null,
  };
}

/** 今日以降に終わる会議（開催中の複数日の会議を含む）。 */
export function isUpcoming(
  meeting: Pick<CouncilMeeting, "meeting_date" | "end_date">,
  today: string
): boolean {
  return (meeting.end_date ?? meeting.meeting_date) >= today;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` 同士の日数差。 */
export function daysBetween(from: string, to: string): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 例：2026-11-26 → 11月26日（木） */
export function formatMeetingDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${weekday}）`;
}

/** 例：10月28日（水）〜30日（金）。同じ月なら後ろの月を省く。 */
export function formatMeetingDateRange(
  start: string,
  end: string | null
): string {
  if (!end) return formatMeetingDate(start);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const endLabel = formatMeetingDate(end);
  return `${formatMeetingDate(start)}〜${sameMonth ? endLabel.replace(/^\d+月/, "") : endLabel}`;
}

/** 開始日の早い順に、最初の `days` 日分の会議だけを残す。同じ日の会議は途中で切らない。 */
export function takeFirstDays<
  T extends { meeting_date: string; end_date: string | null },
>(meetings: T[], days: number): T[] {
  const keys: string[] = [];
  return meetings.filter((m) => {
    const key = `${m.meeting_date}_${m.end_date ?? ""}`;
    if (!keys.includes(key)) {
      if (keys.length >= days) return false;
      keys.push(key);
    }
    return true;
  });
}

/** 例：2026-11-26 → 11.26 */
export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}.${d}`;
}

export const CATEGORY_LABELS: Record<CouncilMeeting["category"], string> = {
  plenary: "本会議",
  standing: "常任委員会",
  special: "特別委員会",
  steering: "議会運営委員会",
  other: "その他",
};

/** 議会期間に入らない議案・報告（閉会中の委員会など）の見出し。 */
export const OUTSIDE_PERIOD_LABEL = "議会期間の外（委員会など）";

/**
 * 議案は開会の前（議会運営委員会など）に配られ、その日付で登録されることがある。
 * 開会日の何日前までなら、その議会期間の議案として扱うか。
 */
export const PERIOD_LEAD_DAYS = 14;

/**
 * `YYYY-MM-DD` が入る議会期間の名前。どの期間にも入らなければ OUTSIDE_PERIOD_LABEL。
 * どの期間にも入らない日付でも、次の議会期間の開会日の PERIOD_LEAD_DAYS 日前以内なら、
 * その期間に入れる（開会前に配られた議案を、その定例会議の議案として並べるため）。
 */
export function periodLabelFor(date: string, periods: CouncilPeriod[]): string {
  const containing = periods.find(
    (p) => p.start_date <= date && date <= p.end_date
  );
  if (containing) return containing.name;
  if (!date) return OUTSIDE_PERIOD_LABEL;

  const upcoming = periods
    .filter((p) => p.start_date > date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (upcoming && daysBetween(date, upcoming.start_date) <= PERIOD_LEAD_DAYS) {
    return upcoming.name;
  }
  return OUTSIDE_PERIOD_LABEL;
}

/** ISO の日時を日本時間の `YYYY-MM-DD` にする。 */
export function toJstDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}
