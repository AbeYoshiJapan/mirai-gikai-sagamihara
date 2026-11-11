import "server-only";

import {
  type MeetingPeriod,
  parseMeetingPeriods,
} from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import type {
  BillDraft,
  CommitteeRef,
  ExistingBill,
} from "@mirai-gikai/shared/import/plan";
import {
  createAdminClient,
  type Database,
  type Json,
} from "@mirai-gikai/supabase";
import type { ImportRunView } from "../../shared/types";

type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];
type SourceKind = Database["public"]["Enums"]["bill_source_kind"];

/** 取込の突合に使う既存の議案（全会期。前の年の番号の継続分が別会期にあることがある） */
export async function findBillsForImport(): Promise<ExistingBill[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "id, name, bill_number, bill_kind, proposer_kind, committee_id, stage, result, vote_outcome, decided_on, submitted_date, status_note, publish_status, diet_session_id, bill_sources(id, kind, url, content_hash, extracted_text)"
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    throw new Error(`議案の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    bill_number: row.bill_number,
    bill_kind: row.bill_kind,
    proposer_kind: row.proposer_kind,
    committee_id: row.committee_id,
    stage: row.stage,
    result: row.result,
    vote_outcome: row.vote_outcome,
    decided_on: row.decided_on,
    submitted_date: row.submitted_date,
    status_note: row.status_note,
    publish_status: row.publish_status,
    diet_session_id: row.diet_session_id,
    sources: (row.bill_sources ?? []).map((s) => ({
      id: s.id,
      kind: s.kind,
      url: s.url,
      content_hash: s.content_hash,
      has_text: (s.extracted_text ?? "").length > 0,
    })),
  }));
}

export async function findCommitteeRefs(): Promise<CommitteeRef[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select("id, name, short_name")
    .eq("is_active", true);
  if (error) {
    throw new Error(`委員会の取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

/** 会期に入れた「定例会議などの期間」。議案書の無い議案の提出日を、定例会議の初日にするのに使う */
export async function findSessionMeetingPeriods(
  sessionId: string
): Promise<MeetingPeriod[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .select("meeting_periods")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    throw new Error(`会期の取得に失敗しました: ${error.message}`);
  }
  return parseMeetingPeriods(data?.meeting_periods ?? []);
}

export async function insertDraftBill(draft: BillDraft): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .insert({
      name: draft.name,
      bill_number: draft.bill_number,
      bill_kind: draft.bill_kind,
      proposer_kind: draft.proposer_kind,
      committee_id: draft.committee_id,
      stage: draft.stage,
      submitted_date: draft.submitted_date,
      diet_session_id: draft.diet_session_id,
      // 取込は必ず下書き。公開は管理者の操作だけ
      publish_status: "draft",
      is_review_completed: false,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`議案の作成に失敗しました: ${error.message}`);
  }
  return data.id;
}

export async function updateBillFields(
  id: string,
  fields: BillUpdate
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bills").update(fields).eq("id", id);
  if (error) {
    throw new Error(`議案の更新に失敗しました: ${error.message}`);
  }
}

export async function insertBillSource(params: {
  billId: string;
  kind: SourceKind;
  url: string;
  label: string;
  extractedText: string | null;
  contentHash: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bill_sources").insert({
    bill_id: params.billId,
    kind: params.kind,
    url: params.url,
    label: params.label,
    extracted_text: params.extractedText,
    content_hash: params.contentHash,
    fetched_at: params.extractedText ? new Date().toISOString() : null,
  });
  if (error) {
    throw new Error(`一次資料の追加に失敗しました: ${error.message}`);
  }
}

export async function updateBillSourceText(params: {
  id: string;
  extractedText: string;
  contentHash: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bill_sources")
    .update({
      extracted_text: params.extractedText,
      content_hash: params.contentHash,
      fetched_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error) {
    throw new Error(`一次資料の本文の更新に失敗しました: ${error.message}`);
  }
}

export async function createImportRun(params: {
  sourceId: string;
  adapter: string;
  dryRun: boolean;
  triggeredBy: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("import_runs")
    .insert({
      source_id: params.sourceId,
      adapter: params.adapter,
      dry_run: params.dryRun,
      triggered_by: params.triggeredBy,
      status: "running",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`取込の記録に失敗しました: ${error.message}`);
  }
  return data.id;
}

export async function finishImportRun(params: {
  id: string;
  status: "succeeded" | "failed";
  summary: Record<string, number>;
  log: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("import_runs")
    .update({
      status: params.status,
      summary: params.summary as Json,
      log: params.log,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error) {
    console.error("Failed to finish import run:", error);
  }
}

export async function findRecentImportRuns(
  limit = 20
): Promise<ImportRunView[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("import_runs")
    .select(
      "id, source_id, adapter, status, dry_run, started_at, finished_at, summary, log"
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`取込の履歴の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    ...row,
    summary: (row.summary ?? {}) as Record<string, unknown>,
  }));
}
