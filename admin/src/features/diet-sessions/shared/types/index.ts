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
  /** JSON 列。要素は MeetingPeriod。読むときは parseMeetingPeriods で検証する */
  meeting_periods: Json;
  created_at: string;
  updated_at: string;
};

export type CreateDietSessionInput = {
  name: string;
  slug: string | null;
  shugiin_url: string | null;
  start_date: string;
  end_date: string;
  /** 定例会議・臨時会議の期間。空なら公開サイトは会議予定から導出する */
  meeting_periods: MeetingPeriod[];
};

export type UpdateDietSessionInput = {
  id: string;
  name: string;
  slug: string | null;
  shugiin_url: string | null;
  start_date: string;
  end_date: string;
  meeting_periods: MeetingPeriod[];
};

export type DeleteDietSessionInput = {
  id: string;
};
