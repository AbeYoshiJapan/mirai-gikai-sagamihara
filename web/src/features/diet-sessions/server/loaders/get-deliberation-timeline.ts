import {
  buildDeliberationTimeline,
  type DeliberationTimeline,
} from "@mirai-gikai/shared/bill-stage/deliberation-timing";
import { unstable_cache } from "next/cache";
import { toDateKey } from "@/features/council-meetings/shared/utils/council-period";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getJapanTime } from "@/lib/utils/date";
import { findDietSessionsForTimeline } from "../repositories/diet-session-repository";

/**
 * 議案の「審議中・継続中・審議予定」を決めるための材料（今日と、会期・定例会議などの期間）。
 * 今日は日本時間で、会期は 1 時間キャッシュする。
 */
export async function getDeliberationTimeline(): Promise<DeliberationTimeline> {
  const sessions = await _getCachedSessionsForTimeline();
  return buildDeliberationTimeline(sessions, toDateKey(getJapanTime()));
}

const _getCachedSessionsForTimeline = unstable_cache(
  async () => findDietSessionsForTimeline(),
  ["diet-sessions-for-timeline"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.DIET_SESSIONS],
  }
);
