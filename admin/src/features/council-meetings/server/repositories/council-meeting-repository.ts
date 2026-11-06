import "server-only";

import type { ExistingSiteMeeting } from "@mirai-gikai/shared/council-meetings/plan-site-import";
import type {
  CommitteeForMeeting,
  MeetingCategory,
} from "@mirai-gikai/shared/council-meetings/resolve-meeting-label";
import {
  createAdminClient,
  type Database,
  type Json,
} from "@mirai-gikai/supabase";
import type { AdminCouncilMeeting, CommitteeOption } from "../../shared/types";

type MeetingInsert = Database["public"]["Tables"]["council_meetings"]["Insert"];
type MeetingUpdate = Database["public"]["Tables"]["council_meetings"]["Update"];

const ADMIN_SELECT =
  "id, meeting_date, end_date, name, category, start_time, place, topic, session_label, committee_id, source, site_label, source_url, stream_url, minutes_url, agenda_pdf_url, result_pdf_url, is_published, confirmed_at, operator_edited_at, fetched_at, pending_update, committees(name)";

type AdminRow = Omit<
  AdminCouncilMeeting,
  "committee_name" | "category" | "source"
> & {
  category: string;
  source: string;
  committees: { name: string } | null;
};

function toAdminMeeting(row: AdminRow): AdminCouncilMeeting {
  const { committees, ...rest } = row;
  return {
    ...rest,
    category: row.category as MeetingCategory,
    source: row.source === "site" ? "site" : "manual",
    committee_name: committees?.name ?? null,
  };
}

/** 管理画面の一覧。期間内の会議を日付順に（同じ日は登録順） */
export async function findMeetingsForAdmin(params: {
  from: string;
  to: string;
}): Promise<AdminCouncilMeeting[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_meetings")
    .select(ADMIN_SELECT)
    .gte("meeting_date", params.from)
    .lte("meeting_date", params.to)
    .order("meeting_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) {
    throw new Error(`会議予定の取得に失敗しました: ${error.message}`);
  }
  return (data as unknown as AdminRow[]).map(toAdminMeeting);
}

export async function findMeetingById(
  id: string
): Promise<AdminCouncilMeeting | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_meetings")
    .select(ADMIN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`会議予定の取得に失敗しました: ${error.message}`);
  }
  return data ? toAdminMeeting(data as unknown as AdminRow) : null;
}

export async function insertMeeting(row: MeetingInsert): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_meetings")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    throw new Error(`会議予定の登録に失敗しました: ${error.message}`);
  }
  return data.id;
}

export async function updateMeeting(
  id: string,
  fields: MeetingUpdate
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_meetings")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`会議予定の更新に失敗しました: ${error.message}`);
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_meetings")
    .delete()
    .eq("id", id);
  if (error) {
    throw new Error(`会議予定の削除に失敗しました: ${error.message}`);
  }
}

/** 確認済みとして公開する（確認した人と日時を残す） */
export async function confirmMeetings(
  ids: string[],
  adminId: string
): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("council_meetings")
    .update({
      is_published: true,
      confirmed_at: now,
      confirmed_by: adminId,
      updated_at: now,
    })
    .in("id", ids)
    .select("id");
  if (error) {
    throw new Error(`会議予定の公開に失敗しました: ${error.message}`);
  }
  return data.length;
}

/** 略称の突き合わせに使う委員会（有効なものだけ） */
export async function findCommitteesForMeetings(): Promise<
  CommitteeForMeeting[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select("id, name, short_name, kind")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`委員会の取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

export async function findCommitteeOptions(): Promise<CommitteeOption[]> {
  const committees = await findCommitteesForMeetings();
  return committees.map((c) => ({ id: c.id, name: c.name }));
}

const SITE_SELECT =
  "id, source_url, meeting_date, end_date, site_label, name, category, committee_id, start_time, place, is_published, operator_edited_at, site_snapshot, pending_update";

type SiteRow = Omit<ExistingSiteMeeting, "category" | "site_label"> & {
  category: string;
  site_label: string | null;
};

function toExistingSiteMeeting(row: SiteRow): ExistingSiteMeeting {
  return {
    ...row,
    site_label: row.site_label ?? "",
    category: row.category as MeetingCategory,
  };
}

/** 取得範囲の、公式サイト由来の会議と、候補と同じ URL の会議 */
export async function findSiteMeetingsForImport(params: {
  from: string;
  to: string;
  urls: string[];
}): Promise<ExistingSiteMeeting[]> {
  const supabase = createAdminClient();
  const byId = new Map<string, ExistingSiteMeeting>();

  const inRange = await supabase
    .from("council_meetings")
    .select(SITE_SELECT)
    .eq("source", "site")
    .gte("meeting_date", params.from)
    .lte("meeting_date", params.to);
  if (inRange.error) {
    throw new Error(`会議予定の取得に失敗しました: ${inRange.error.message}`);
  }
  for (const row of inRange.data ?? []) {
    byId.set(row.id, toExistingSiteMeeting(row as SiteRow));
  }

  // URL の一覧が長くなりすぎないよう、少しずつ問い合わせる
  for (let i = 0; i < params.urls.length; i += 25) {
    const chunk = params.urls.slice(i, i + 25);
    const byUrl = await supabase
      .from("council_meetings")
      .select(SITE_SELECT)
      .eq("source", "site")
      .in("source_url", chunk);
    if (byUrl.error) {
      throw new Error(`会議予定の取得に失敗しました: ${byUrl.error.message}`);
    }
    for (const row of byUrl.data ?? []) {
      byId.set(row.id, toExistingSiteMeeting(row as SiteRow));
    }
  }

  return [...byId.values()];
}

export async function insertSiteMeetings(rows: MeetingInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("council_meetings").insert(rows);
  if (error) {
    throw new Error(`会議予定の仮登録に失敗しました: ${error.message}`);
  }
}

export type CalendarRunView = {
  started_at: string;
  status: string;
  summary: Record<string, unknown>;
  triggered_by: string | null;
} | null;

/** 会議予定の取得（自動・手動）の最後の記録 */
export async function findLatestCalendarRun(): Promise<CalendarRunView> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("import_runs")
    .select("started_at, status, summary, triggered_by")
    .eq("source_id", "council-calendar")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load latest calendar run:", error);
    return null;
  }
  return data
    ? { ...data, summary: (data.summary ?? {}) as Record<string, unknown> }
    : null;
}

export function toJson(value: unknown): Json {
  return value as Json;
}
