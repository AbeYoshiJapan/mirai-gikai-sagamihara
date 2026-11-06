import {
  type MeetingPeriod,
  parseMeetingPeriods,
  sortMeetingPeriods,
} from "../diet-sessions/meeting-periods";

/**
 * 結論が出ていない議案が、いまどの状態にあるか。
 *
 * - in_session：定例会議の期間中で、審議が進んでいる（審議中）
 * - carried_over：定例会議と定例会議の間で、前の定例会議までに出された議案の結論が持ち越されている（継続中）
 * - upcoming：前の定例会議が終わった後に出され、次の定例会議を待っている（審議予定）
 *
 * 境目は、会期管理の「定例会議などの期間」の終了日。日数の決め打ちはしない。
 * 期間がどこにも入っていなければ、会期で判断する。
 */
export type DeliberationTiming = "in_session" | "carried_over" | "upcoming";

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

/** 今日より前に終わった定例会議などの期間のうち、いちばん最近のもの */
function findLastEndedPeriod(
  periods: MeetingPeriod[],
  today: string
): MeetingPeriod | null {
  let last: MeetingPeriod | null = null;
  for (const p of periods) {
    if (p.end_date < today && (!last || p.end_date > last.end_date)) last = p;
  }
  return last;
}

type TimelineSession = DeliberationTimeline["sessions"][number];

function findBillSession(
  bill: { diet_session_id?: string | null },
  timeline: DeliberationTimeline
): TimelineSession | null {
  return timeline.sessions.find((s) => s.id === bill.diet_session_id) ?? null;
}

/** アクティブな会期より前の会期の議案か（定例会議ごとに会期を作っている場合の持ち越し） */
function isFromEarlierSession(
  session: TimelineSession | null,
  timeline: DeliberationTimeline
): boolean {
  const active = timeline.activeSession;
  return (
    session !== null &&
    active !== null &&
    session.id !== active.id &&
    session.start_date < active.start_date
  );
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
  const session = findBillSession(bill, timeline);

  if (periods.length > 0) {
    if (periods.some((p) => p.start_date <= today && today <= p.end_date)) {
      return "in_session";
    }
    if (!submitted) return null;
    if (submitted > today) return "upcoming";
    // 前の定例会議が終わった後に出たものは次を待つ（審議予定）。
    // 前の定例会議の最終日までに出ていて結論がないものは持ち越し（継続中）
    const lastEnded = findLastEndedPeriod(periods, today);
    if (lastEnded) {
      return submitted > lastEnded.end_date ? "upcoming" : "carried_over";
    }
    // 終わった定例会議の期間がまだ入っていない：前の会期の議案は持ち越し、ほかは次を待つ
    return isFromEarlierSession(session, timeline) ? "carried_over" : "upcoming";
  }

  // 期間が入っていないとき：会期で判断する
  if (!session) return null;
  if (isFromEarlierSession(session, timeline)) return "carried_over";
  if (today < session.start_date) return "upcoming";
  if (session.end_date < today) return "carried_over";
  return "in_session";
}
