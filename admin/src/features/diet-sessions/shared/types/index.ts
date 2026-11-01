import type { Json } from "@mirai-gikai/supabase";

/** 定例会議・臨時会議の期間（diet_sessions.meeting_periods の要素） */
export type MeetingPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

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
};

export type UpdateDietSessionInput = {
  id: string;
  name: string;
  slug: string | null;
  shugiin_url: string | null;
  start_date: string;
  end_date: string;
};

export type DeleteDietSessionInput = {
  id: string;
};
