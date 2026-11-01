import { getSiteSettings } from "@/lib/site-settings/loader";
import type { CouncilMeeting } from "../../shared/types";
import {
  type CouncilStatus,
  councilYearOf,
  extractCouncilPeriods,
  getCouncilStatus,
  isUpcoming,
  toDateKey,
} from "../../shared/utils/council-period";
import { getCouncilMeetings } from "./get-council-meetings";

export type CouncilSchedule = {
  /** `YYYY-MM-DD`（日本時間） */
  today: string;
  status: CouncilStatus;
  /** 議会年度の全会議（日付順）。 */
  meetings: CouncilMeeting[];
  /** 今日以降の会議（開催中の複数日の会議を含む）。 */
  upcoming: CouncilMeeting[];
  todayMeetings: CouncilMeeting[];
  /** 明日以降で最初に会議が開かれる日の会議（同じ日のものすべて）。 */
  nextMeetings: CouncilMeeting[];
};

/** 議会の状況と会議予定をまとめて読む。`now` は日本時間を渡す。 */
export async function loadCouncilSchedule(now: Date): Promise<CouncilSchedule> {
  const today = toDateKey(now);
  const { council } = await getSiteSettings();
  const councilYear = councilYearOf(now, council.year_start_month);
  const meetings = await getCouncilMeetings(councilYear);
  const upcoming = meetings.filter((m) => isUpcoming(m, today));
  const later = upcoming.filter((m) => m.meeting_date > today);

  return {
    today,
    status: getCouncilStatus(
      extractCouncilPeriods(meetings),
      today,
      councilYear
    ),
    meetings,
    upcoming,
    todayMeetings: upcoming.filter((m) => m.meeting_date <= today),
    nextMeetings: later.filter(
      (m) => m.meeting_date === later[0]?.meeting_date
    ),
  };
}
