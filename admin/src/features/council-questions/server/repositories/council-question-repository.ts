import "server-only";

import { readNoticeItems } from "@mirai-gikai/shared/council-questions/types";
import {
  createAdminClient,
  type Database,
  type Json,
} from "@mirai-gikai/supabase";
import { isMissingSchemaError } from "@mirai-gikai/shared/db/missing-schema-error";
import type {
  AdminCouncilQuestion,
  CouncilQuestionKind,
  QuestionMeetingSummary,
  QuestionPendingUpdate,
  QuestionThemeLink,
  ThemeOption,
} from "../../shared/types";
import type { ExistingQuestion } from "../../shared/utils/build-question-import";

type QuestionInsert =
  Database["public"]["Tables"]["council_questions"]["Insert"];
type QuestionUpdate =
  Database["public"]["Tables"]["council_questions"]["Update"];

const ADMIN_SELECT =
  "id, meeting_key, meeting_name, list_kind, kind, order_no, seat_number, member_name, faction_label, method, question_date, notice_date, items, bill_refs, source_url, stream_url, minutes_url, is_published, confirmed_at, operator_edited_at, fetched_at, pending_update, updated_at";

type QuestionRow = Omit<
  AdminCouncilQuestion,
  "list_kind" | "kind" | "items" | "pending_update"
> & {
  list_kind: string;
  kind: string;
  items: Json;
  pending_update: Json | null;
};

function toAdminQuestion(row: QuestionRow): AdminCouncilQuestion {
  return {
    ...row,
    list_kind:
      row.list_kind === "representative" ? "representative" : "general",
    kind: row.kind as CouncilQuestionKind,
    items: readNoticeItems(row.items),
    pending_update: (row.pending_update ??
      null) as unknown as QuestionPendingUpdate | null,
  };
}

/** 定例会議ごとの件数（新しい定例会議が先） */
/** 定例会議ごとの件数。DB の更新（db push）前で表が無ければ null */
export async function findQuestionMeetingSummaries(): Promise<
  QuestionMeetingSummary[] | null
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select("meeting_key, meeting_name, is_published, pending_update");
  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw new Error(`議会での質問の取得に失敗しました: ${error.message}`);
  }
  const byKey = new Map<string, QuestionMeetingSummary>();
  for (const row of data ?? []) {
    const summary = byKey.get(row.meeting_key) ?? {
      meeting_key: row.meeting_key,
      meeting_name: row.meeting_name,
      total: 0,
      published: 0,
      pending: 0,
    };
    summary.total++;
    if (row.is_published) summary.published++;
    if (row.pending_update) summary.pending++;
    byKey.set(row.meeting_key, summary);
  }
  return [...byKey.values()].sort((a, b) =>
    b.meeting_key.localeCompare(a.meeting_key)
  );
}

export async function findQuestionsByMeeting(
  meetingKey: string
): Promise<AdminCouncilQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(ADMIN_SELECT)
    .eq("meeting_key", meetingKey)
    .order("list_kind", { ascending: false })
    .order("order_no", { ascending: true });
  if (error) {
    throw new Error(`議会での質問の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => toAdminQuestion(row as QuestionRow));
}

export async function findQuestionById(
  id: string
): Promise<AdminCouncilQuestion | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(ADMIN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`議会での質問の取得に失敗しました: ${error.message}`);
  }
  return data ? toAdminQuestion(data as QuestionRow) : null;
}

/** 取込の差分を決めるのに使う列 */
export async function findExistingQuestionsForImport(
  meetingKey: string
): Promise<ExistingQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(
      "id, list_kind, order_no, is_published, operator_edited_at, site_snapshot"
    )
    .eq("meeting_key", meetingKey);
  if (error) {
    throw new Error(`議会での質問の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    ...row,
    list_kind:
      row.list_kind === "representative" ? "representative" : "general",
  }));
}

export async function insertQuestions(rows: QuestionInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("council_questions").insert(rows);
  if (error) {
    throw new Error(`議会での質問の仮登録に失敗しました: ${error.message}`);
  }
}

export async function updateQuestion(
  id: string,
  fields: QuestionUpdate
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_questions")
    .update(fields)
    .eq("id", id);
  if (error) {
    throw new Error(`議会での質問の更新に失敗しました: ${error.message}`);
  }
}

export async function deleteQuestions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("council_questions")
    .delete()
    .in("id", ids);
  if (error) {
    throw new Error(`議会での質問の削除に失敗しました: ${error.message}`);
  }
}

/** テーマ（タグ）の候補。テーマとして公開しているものが先 */
export async function findThemeOptions(): Promise<ThemeOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, is_theme, theme_order")
    .order("is_theme", { ascending: false })
    .order("theme_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) throw new Error(`テーマの取得に失敗しました: ${error.message}`);
  return (data ?? []).map(({ id, label, is_theme }) => ({
    id,
    label,
    is_theme,
  }));
}

export async function findQuestionThemeLinks(
  questionId: string
): Promise<QuestionThemeLink[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_question_themes")
    .select("item_number, tag_id")
    .eq("question_id", questionId)
    .order("item_number", { ascending: true });
  if (error) {
    throw new Error(`テーマのひも付けの取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

/** 質問のテーマのひも付けを、渡したものに入れ替える */
export async function replaceQuestionThemeLinks(
  questionId: string,
  links: QuestionThemeLink[],
  userId: string | null
): Promise<void> {
  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from("council_question_themes")
    .delete()
    .eq("question_id", questionId);
  if (deleteError) {
    throw new Error(
      `テーマのひも付けの更新に失敗しました: ${deleteError.message}`
    );
  }
  if (links.length === 0) return;
  const { error } = await supabase.from("council_question_themes").insert(
    links.map((link) => ({
      question_id: questionId,
      item_number: link.item_number,
      tag_id: link.tag_id,
      created_by: userId,
    }))
  );
  if (error) {
    throw new Error(`テーマのひも付けの更新に失敗しました: ${error.message}`);
  }
}
