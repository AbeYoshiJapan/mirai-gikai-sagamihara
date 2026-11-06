import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { CouncilMeeting } from "../../shared/types";

const MEETING_SELECT =
  "id, meeting_date, end_date, name, category, start_time, place, gallery, topic, document_url, council_year, source_url, stream_url, minutes_url, agenda_pdf_url, result_pdf_url, session_label, site_label";

/** 議会年度の会議予定（公開済みのもの）を日付順に取得する。取込直後の未確認分は出さない。 */
export async function findCouncilMeetingsByYear(
  councilYear: number
): Promise<CouncilMeeting[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_meetings")
    .select(MEETING_SELECT)
    .eq("council_year", councilYear)
    .eq("is_published", true)
    .order("meeting_date", { ascending: true })
    // 同じ日は議会サイトの並び（取り込み順）を保つ
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch council meetings:", error);
    return [];
  }

  return data as CouncilMeeting[];
}

/**
 * 期間に重なる会議予定（公開済み＝運営者が確認したものだけ）。カレンダーの月表示用。
 * 複数日の会議は開始日が期間より前のこともあるので、少し前から読んで絞る。
 */
export async function findPublishedMeetingsBetween(
  from: string,
  to: string
): Promise<CouncilMeeting[]> {
  const supabase = createAdminClient();
  const [y, m, d] = from.split("-").map(Number);
  const lookback = new Date(Date.UTC(y, m - 1, d - 31))
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("council_meetings")
    .select(MEETING_SELECT)
    .eq("is_published", true)
    .gte("meeting_date", lookback)
    .lte("meeting_date", to)
    .order("meeting_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch council meetings for calendar:", error);
    return [];
  }

  return (data as CouncilMeeting[]).filter(
    (meeting) => (meeting.end_date ?? meeting.meeting_date) >= from
  );
}
