import type { CouncilMeeting, CouncilPeriod } from "../types";

export type YearMonth = { year: number; month: number };

export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  /** 表示している月の日か（前後の月のマスは false） */
  inMonth: boolean;
  /** 0 = 日曜 … 6 = 土曜 */
  weekday: number;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function monthKeyOf({ year, month }: YearMonth): string {
  return `${year}-${pad2(month)}`;
}

/** `?month=2026-11` を読む。読めなければ今日の月 */
export function parseMonthParam(value: unknown, today: string): YearMonth {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        return { year, month };
      }
    }
  }
  const [year, month] = today.split("-").map(Number);
  return { year, month };
}

export function shiftYearMonth(
  { year, month }: YearMonth,
  delta: number
): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function dateKeyOfUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** 日曜始まりの月のカレンダー（前後の月のマスを含む週の並び） */
export function buildMonthGrid({ year, month }: YearMonth): CalendarDay[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, lastDay));
  const end = new Date(last);
  end.setUTCDate(lastDay + (6 - last.getUTCDay()));

  const weeks: CalendarDay[][] = [];
  for (const cursor = new Date(start); cursor <= end; ) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        date: dateKeyOfUtc(cursor),
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month - 1,
        weekday: cursor.getUTCDay(),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** カレンダーの最初と最後のマスの日付 */
export function gridRange(weeks: CalendarDay[][]): {
  from: string;
  to: string;
} {
  return { from: weeks[0][0].date, to: weeks[weeks.length - 1][6].date };
}

function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (
    const cursor = new Date(Date.UTC(y, m - 1, d));
    dateKeyOfUtc(cursor) <= to;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    dates.push(dateKeyOfUtc(cursor));
    if (dates.length > 60) break;
  }
  return dates;
}

/** 日付ごとの会議。複数日の会議（管外行政調査など）は、その間の日すべてに入れる */
export function meetingsByDate(
  meetings: CouncilMeeting[]
): Map<string, CouncilMeeting[]> {
  const byDate = new Map<string, CouncilMeeting[]>();
  for (const meeting of meetings) {
    const dates = meeting.end_date
      ? eachDate(meeting.meeting_date, meeting.end_date)
      : [meeting.meeting_date];
    for (const date of dates) {
      const list = byDate.get(date) ?? [];
      list.push(meeting);
      byDate.set(date, list);
    }
  }
  return byDate;
}

/** マスに出す短い名前（カレンダーの略称があればそれ、なければ「委員会」を省く） */
export function calendarCellLabel(
  meeting: Pick<CouncilMeeting, "name" | "site_label">
): string {
  return meeting.site_label || meeting.name.replace(/委員会$/, "");
}

/** その日を含む議会期間（定例会議など） */
export function periodOnDate(
  date: string,
  periods: CouncilPeriod[]
): CouncilPeriod | null {
  return (
    periods.find((p) => p.start_date <= date && date <= p.end_date) ?? null
  );
}

/** 表示している月とその前後の月に重なる議会期間（見出しに出す） */
export function periodsInMonth(
  { year, month }: YearMonth,
  periods: CouncilPeriod[]
): CouncilPeriod[] {
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-${pad2(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;
  return periods.filter((p) => p.start_date <= to && p.end_date >= from);
}
