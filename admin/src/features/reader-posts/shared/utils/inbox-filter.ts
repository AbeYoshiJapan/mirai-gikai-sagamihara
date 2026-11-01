import {
  READER_OPINION_STATUSES,
  READER_QUESTION_STATUSES,
  type ReaderOpinionStatus,
  type ReaderQuestionStatus,
} from "@mirai-gikai/shared/reader-posts/labels";

export type OpinionInboxFilter = ReaderOpinionStatus | "all";
export type QuestionInboxFilter = ReaderQuestionStatus | "all";

/** ?status= の値を意見の絞り込みに変換する。不正・未指定なら「未対応」 */
export function parseOpinionInboxFilter(
  value: string | string[] | undefined
): OpinionInboxFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all") return "all";
  return (READER_OPINION_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as ReaderOpinionStatus)
    : "received";
}

/** ?status= の値を質問の絞り込みに変換する。不正・未指定なら「未回答」 */
export function parseQuestionInboxFilter(
  value: string | string[] | undefined
): QuestionInboxFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all") return "all";
  return (READER_QUESTION_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as ReaderQuestionStatus)
    : "received";
}

/** ?billId= の値（UUID 以外は無視） */
export function parseBillIdFilter(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    raw
  )
    ? raw
    : null;
}
