import "server-only";

import { isMissingSchemaError } from "@mirai-gikai/shared/db/missing-schema-error";
import {
  getPublicQuestionText,
  type ReaderQuestionKind,
  toReaderQuestionKind,
} from "@mirai-gikai/shared/reader-posts/labels";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { PublicReaderQuestion } from "../../shared/types";

export async function createReaderQuestion(params: {
  billId: string | null;
  body: string;
  contact: string;
  consentToPublish: boolean;
  ipHash: string | null;
  kind: ReaderQuestionKind;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_questions")
    .insert({
      bill_id: params.billId,
      body: params.body,
      contact: params.contact,
      consent_to_publish: params.consentToPublish,
      ip_hash: params.ipHash,
      // kind の既定値は DB 側で "question"。既定と同じときは送らない
      // （kind 列を足す db push の前でも、これまでどおり質問を受け付けられるように）
      ...(params.kind !== "question" && { kind: params.kind }),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create reader question: ${error.message}`);
  }
  return data;
}

const PUBLISHED_QUESTION_SELECT =
  "id, kind, bill_id, body, question_summary, answer_md, published_at, bills(name)";

/** kind 列を足す db push の前に読むときの select（すべて質問として扱う） */
const PUBLISHED_QUESTION_SELECT_WITHOUT_KIND =
  "id, bill_id, body, question_summary, answer_md, published_at, bills(name)";

type PublishedQuestionRow = {
  id: string;
  kind?: string;
  bill_id: string | null;
  body: string;
  question_summary: string;
  answer_md: string;
  published_at: string | null;
  bills: { name: string } | null;
};

function toPublicQuestion(row: PublishedQuestionRow): PublicReaderQuestion {
  return {
    id: row.id,
    kind: toReaderQuestionKind(row.kind),
    bill_id: row.bill_id,
    bill_name: row.bills?.name ?? null,
    question: getPublicQuestionText(row),
    answer_md: row.answer_md,
    published_at: row.published_at,
  };
}

type SelectResult = PromiseLike<{
  data: unknown;
  error: { code?: string | null; message: string } | null;
}>;

/** 公開中の質問を読む。kind 列がまだ無いとき（db push の前）は kind 抜きで読み直す */
async function fetchPublishedQuestions(
  run: (select: string) => SelectResult
): Promise<PublicReaderQuestion[]> {
  let { data, error } = await run(PUBLISHED_QUESTION_SELECT);
  if (isMissingSchemaError(error)) {
    ({ data, error } = await run(PUBLISHED_QUESTION_SELECT_WITHOUT_KIND));
  }
  if (error) {
    throw new Error(`Failed to fetch published questions: ${error.message}`);
  }
  return ((data ?? []) as PublishedQuestionRow[]).map(toPublicQuestion);
}

/** 議案に紐づく公開中の質問と回答。新しい順 */
export async function findPublishedQuestionsByBillId(
  billId: string,
  limit: number
): Promise<PublicReaderQuestion[]> {
  const supabase = createAdminClient();
  return fetchPublishedQuestions((select) =>
    supabase
      .from("reader_questions")
      .select(select)
      .eq("bill_id", billId)
      .eq("status", "published")
      .eq("consent_to_publish", true)
      .order("published_at", { ascending: false })
      .limit(limit)
  );
}

/** サイト全体の公開中の質問と回答（よくある質問ページ）。新しい順 */
export async function findAllPublishedQuestions(
  limit: number
): Promise<PublicReaderQuestion[]> {
  const supabase = createAdminClient();
  return fetchPublishedQuestions((select) =>
    supabase
      .from("reader_questions")
      .select(select)
      .eq("status", "published")
      .eq("consent_to_publish", true)
      .order("published_at", { ascending: false })
      .limit(limit)
  );
}
