import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilMeeting } from "../../shared/types";
import {
  findCouncilMeetingsByYear,
  findPublishedMeetingsBetween,
} from "../repositories/council-meeting-repository";

/** 議会年度の会議予定を取得する。 */
export async function getCouncilMeetings(
  councilYear: number
): Promise<CouncilMeeting[]> {
  return _getCachedCouncilMeetings(councilYear);
}

const _getCachedCouncilMeetings = unstable_cache(
  async (councilYear: number): Promise<CouncilMeeting[]> =>
    findCouncilMeetingsByYear(councilYear),
  ["council-meetings"],
  {
    revalidate: 3600, // 1時間（3600秒）
    tags: [CACHE_TAGS.COUNCIL_MEETINGS],
  }
);

/** カレンダーの月表示用。期間に重なる公開済みの会議予定 */
export async function getPublishedMeetingsBetween(
  from: string,
  to: string
): Promise<CouncilMeeting[]> {
  return _getCachedMeetingsBetween(from, to);
}

const _getCachedMeetingsBetween = unstable_cache(
  async (from: string, to: string): Promise<CouncilMeeting[]> =>
    findPublishedMeetingsBetween(from, to),
  ["council-meetings-between"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_MEETINGS],
  }
);
