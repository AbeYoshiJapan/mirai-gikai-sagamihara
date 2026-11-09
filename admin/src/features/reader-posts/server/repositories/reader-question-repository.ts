import "server-only";

import { isMissingSchemaError } from "@mirai-gikai/shared/db/missing-schema-error";
import type { ReaderQuestionStatus } from "@mirai-gikai/shared/reader-posts/labels";
import { toReaderQuestionKind } from "@mirai-gikai/shared/reader-posts/labels";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { ReaderQuestionItem } from "../../shared/types";

const QUESTION_SELECT =
  "id, kind, bill_id, body, contact, consent_to_publish, status, question_summary, answer_md, answered_at, published_at, created_at, bills(name)";

/** kind 列を足す db push の前に読むときの select（すべて質問として扱う） */
const QUESTION_SELECT_WITHOUT_KIND =
  "id, bill_id, body, contact, consent_to_publish, status, question_summary, answer_md, answered_at, published_at, created_at, bills(name)";

type QuestionRow = {
  id: string;
  kind?: string;
  bill_id: string | null;
  body: string;
  contact: string;
  consent_to_publish: boolean;
  status: ReaderQuestionStatus;
  question_summary: string;
  answer_md: string;
  answered_at: string | null;
  published_at: string | null;
  created_at: string;
  bills: { name: string } | null;
};

function toItem(row: QuestionRow): ReaderQuestionItem {
  return {
    id: row.id,
    kind: toReaderQuestionKind(row.kind),
    bill_id: row.bill_id,
    bill_name: row.bills?.name ?? null,
    body: row.body,
    contact: row.contact,
    consent_to_publish: row.consent_to_publish,
    status: row.status,
    question_summary: row.question_summary,
    answer_md: row.answer_md,
    answered_at: row.answered_at,
    published_at: row.published_at,
    created_at: row.created_at,
  };
}

export async function findReaderQuestions(params: {
  status: ReaderQuestionStatus | "all";
  billId: string | null;
  limit: number;
}): Promise<ReaderQuestionItem[]> {
  const supabase = createAdminClient();
  const run = (select: string) => {
    let query = supabase
      .from("reader_questions")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(params.limit);
    if (params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.billId) {
      query = query.eq("bill_id", params.billId);
    }
    return query;
  };

  let { data, error } = await run(QUESTION_SELECT);
  // kind 列がまだ無いとき（db push の前）は kind 抜きで読み直す
  if (isMissingSchemaError(error)) {
    ({ data, error } = await run(QUESTION_SELECT_WITHOUT_KIND));
  }
  if (error) {
    throw new Error(`Failed to fetch reader questions: ${error.message}`);
  }
  return ((data ?? []) as unknown as QuestionRow[]).map(toItem);
}

export async function countReaderQuestionsByStatus(
  billId: string | null
): Promise<Record<ReaderQuestionStatus, number>> {
  const supabase = createAdminClient();
  const counts: Record<ReaderQuestionStatus, number> = {
    received: 0,
    answered: 0,
    published: 0,
    closed: 0,
  };
  await Promise.all(
    (Object.keys(counts) as ReaderQuestionStatus[]).map(async (status) => {
      let query = supabase
        .from("reader_questions")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (billId) query = query.eq("bill_id", billId);
      const { count, error } = await query;
      if (error) {
        throw new Error(`Failed to count reader questions: ${error.message}`);
      }
      counts[status] = count ?? 0;
    })
  );
  return counts;
}

export async function findReaderQuestionById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_questions")
    .select("id, status, consent_to_publish")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch reader question: ${error.message}`);
  }
  return data;
}

/**
 * 質問への回答・公開状態を保存する。answered_at / published_at は DB トリガーが status に合わせて揃える。
 */
export async function updateReaderQuestionAnswer(params: {
  id: string;
  status: ReaderQuestionStatus;
  answerMd: string;
  questionSummary: string;
  answererId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reader_questions")
    .update({
      status: params.status,
      answer_md: params.answerMd,
      question_summary: params.questionSummary,
      answered_by: params.status === "received" ? null : params.answererId,
    })
    .eq("id", params.id);
  if (error) {
    throw new Error(`Failed to update reader question: ${error.message}`);
  }
}
