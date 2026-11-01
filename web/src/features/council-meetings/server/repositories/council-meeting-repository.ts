import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { CouncilMeeting } from "../../shared/types";

/** 議会年度の会議予定（公開済みのもの）を日付順に取得する。取込直後の未確認分は出さない。 */
export async function findCouncilMeetingsByYear(
  councilYear: number
): Promise<CouncilMeeting[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_meetings")
    .select(
      "id, meeting_date, end_date, name, category, start_time, place, gallery, topic, document_url, council_year, source_url, stream_url, minutes_url, agenda_pdf_url, result_pdf_url, session_label"
    )
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
