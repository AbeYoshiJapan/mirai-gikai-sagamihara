import {
  type MeetingPeriod,
  parseMeetingPeriods,
  sortMeetingPeriods,
} from "../diet-sessions/meeting-periods";

/**
 * 結論が出ていない議案が、いまどの状態にあるか。
 *
 * - in_session：定例会議の期間中で、審議が進んでいる（審議中）
 * - carried_over：定例会議と定例会議の間で、前の定例会議から結論が持ち越されている（継続中）
 * - upcoming：次の定例会議に向けて出された議案で、まだ開会前（審議予定）
 *
 * 期間は会期管理の「定例会議などの期間」から読む。期間がどこにも入っていなければ、会期で判断する。
 */
export type DeliberationTiming = "in_session" | "carried_over" | "upcoming";

/** 開会のこの日数前より後に出された議案は、次の定例会議の議案（審議予定）とみなす */
export const UPCOMING_LEAD_DAYS = 14;

export type TimelineSessionInput = {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  meeting_periods: unknown;
};

export type DeliberationTimeline = {
  /** 日本時間の今日（YYYY-MM-DD） */
  today: string;
  /** すべての会期の「定例会議などの期間」（開始日順） */
  periods: MeetingPeriod[];
  /** 期間が入っていないときの判断に使う会期 */
  sessions: { id: string; start_date: string; end_date: string }[];
  activeSession: { id: string; start_date: string } | null;
};

export function buildDeliberationTimeline(
  sessions: TimelineSessionInput[],
  today: string
): DeliberationTimeline {
  const seen = new Set<string>();
  const periods = sortMeetingPeriods(
    sessions
      .flatMap((s) => parseMeetingPeriods(s.meeting_periods))
      .filter((p) => {
        const key = `${p.start_date}/${p.end_date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
  );
  const active = sessions.find((s) => s.is_active) ?? null;
  return {
    today,
    periods,
    sessions: sessions.map(({ id, start_date, end_date }) => ({
      id,
      start_date,
      end_date,
    })),
    activeSession: active
      ? { id: active.id, start_date: active.start_date }
      : null,
  };
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 提出日を日本時間の `YYYY-MM-DD` にする。
 * DB の提出日は日時（timestamptz、例 2026-11-16T15:00:00+00:00 = 日本時間 11/17 0 時）で来ることがある。
 */
export function toJstDateKeyOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` を日数だけずらす */
function shiftDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDeliberationTiming(
  bill: {
    submitted_date?: string | null;
    diet_session_id?: string | null;
  },
  timeline: DeliberationTimeline
): DeliberationTiming | null {
  const { today, periods } = timeline;
  const submitted = toJstDateKeyOf(bill.submitted_date);

  if (periods.length > 0) {
    if (periods.some((p) => p.start_date <= today && today <= p.end_date)) {
      return "in_session";
    }
    if (!submitted) return null;
    if (submitted > today) return "upcoming";
    const next = periods.find((p) => p.start_date > today);
    if (
      next &&
      submitted >= shiftDays(next.start_date, -UPCOMING_LEAD_DAYS)
    ) {
      return "upcoming";
    }
    return "carried_over";
  }

  // 期間が入っていないとき：会期で判断する
  const session = timeline.sessions.find(
    (s) => s.id === bill.diet_session_id
  );
  if (!session) return null;
  const active = timeline.activeSession;
  if (
    active &&
    session.id !== active.id &&
    session.start_date < active.start_date
  ) {
    return "carried_over";
  }
  if (today < session.start_date) return "upcoming";
  if (session.end_date < today) return "carried_over";
  return "in_session";
}
