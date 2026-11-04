import type { MeetingPeriod } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import type { Json } from "@mirai-gikai/supabase";

export type { MeetingPeriod };

export type DietSession = {
  id: string;
  name: string;
  slug: string | null;
  shugiin_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  /**
   * JSON 列。要素は MeetingPeriod（定例会議・臨時会議の期間）。
   * 読むときは @mirai-gikai/shared/diet-sessions/meeting-periods の parseMeetingPeriods で検証する
   */
  meeting_periods: Json;
  created_at: string;
  updated_at: string;
};

/** slug が設定済みの会期。会期ページへリンクする一覧で使う。 */
export type SluggedDietSession = DietSession & { slug: string };
