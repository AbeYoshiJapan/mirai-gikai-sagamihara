import { parseMeetingPeriods } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import { getActiveDietSession } from "@/features/diet-sessions/server/loaders/get-active-diet-session";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { getSiteSettings } from "@/lib/site-settings/loader";
import type { CouncilMeeting, CouncilPeriod } from "../../shared/types";
import {
  type CouncilStatus,
  councilYearOf,
  getCouncilStatus,
  isUpcoming,
  resolveCouncilPeriods,
  toDateKey,
} from "../../shared/utils/council-period";
import { getCouncilMeetings } from "./get-council-meetings";

export type CouncilSchedule = {
  /** `YYYY-MM-DD`（日本時間） */
  today: string;
  status: CouncilStatus;
  /** 議会年度の議会期間（定例会議など、開始日順）。 */
  periods: CouncilPeriod[];
  /** 議会年度の全会議（日付順）。 */
  meetings: CouncilMeeting[];
  /** 今日以降の会議（開催中の複数日の会議を含む）。 */
  upcoming: CouncilMeeting[];
  todayMeetings: CouncilMeeting[];
  /** 明日以降で最初に会議が開かれる日の会議（同じ日のものすべて）。 */
  nextMeetings: CouncilMeeting[];
};

/**
 * 会期管理で入力した議会期間（定例会議など）。今日を含む会期を優先し、
 * 無ければアクティブな会期（トップに議案を出している会期）のものを使う。
 */
async function loadConfiguredPeriods(now: Date): Promise<CouncilPeriod[]> {
  const current = await getCurrentDietSession(now);
  const fromCurrent = current
    ? parseMeetingPeriods(current.meeting_periods)
    : [];
  if (fromCurrent.length > 0) return fromCurrent;

  const active = await getActiveDietSession();
  return active ? parseMeetingPeriods(active.meeting_periods) : [];
}

/** 議会の状況と会議予定をまとめて読む。`now` は日本時間を渡す。 */
export async function loadCouncilSchedule(now: Date): Promise<CouncilSchedule> {
  const today = toDateKey(now);
  const [{ council }, configuredPeriods] = await Promise.all([
    getSiteSettings(),
    loadConfiguredPeriods(now),
  ]);
  const councilYear = councilYearOf(now, council.year_start_month);
  const meetings = await getCouncilMeetings(councilYear);
  const periods = resolveCouncilPeriods(configuredPeriods, meetings);
  const upcoming = meetings.filter((m) => isUpcoming(m, today));
  const later = upcoming.filter((m) => m.meeting_date > today);

  return {
    today,
    status: getCouncilStatus(periods, today, councilYear),
    periods,
    meetings,
    upcoming,
    todayMeetings: upcoming.filter((m) => m.meeting_date <= today),
    nextMeetings: later.filter(
      (m) => m.meeting_date === later[0]?.meeting_date
    ),
  };
}
