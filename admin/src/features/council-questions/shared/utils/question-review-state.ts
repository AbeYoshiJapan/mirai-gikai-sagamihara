import type { AdminCouncilQuestion } from "../types";
import { stableStringify } from "./build-question-import";

export type QuestionReviewState =
  | "provisional"
  | "changed"
  | "removed"
  | "published";

export const QUESTION_REVIEW_STATE_LABELS: Record<QuestionReviewState, string> =
  {
    provisional: "仮登録",
    changed: "公式の通告一覧が変わった",
    removed: "公式の通告一覧から消えた",
    published: "公開中",
  };

/** 一覧に出す状態。公式の変更・削除の保留を先に知らせる */
export function getQuestionReviewState(
  question: Pick<AdminCouncilQuestion, "is_published" | "pending_update">
): QuestionReviewState {
  if (question.pending_update?.kind === "removed") return "removed";
  if (question.pending_update?.kind === "changed") return "changed";
  return question.is_published ? "published" : "provisional";
}

/** 通告一覧から読む内容（取込で決める区分を含む）。運営者がここを直したら「手を入れた」とみなす */
export type NoticeContentFields = Pick<
  AdminCouncilQuestion,
  | "kind"
  | "seat_number"
  | "member_name"
  | "faction_label"
  | "method"
  | "question_date"
  | "items"
>;

/**
 * 保存で、通告一覧から読んだ内容が変わるか。
 * 中継・会議録のリンクやテーマだけの変更なら false（次の取込で公式の内容に合わせてよい）。
 */
export function isNoticeContentEdited(
  current: NoticeContentFields,
  next: NoticeContentFields
): boolean {
  const pick = (q: NoticeContentFields) => ({
    kind: q.kind,
    seat_number: q.seat_number,
    member_name: q.member_name,
    faction_label: q.faction_label,
    method: q.method,
    question_date: q.question_date,
    items: q.items,
  });
  return stableStringify(pick(current)) !== stableStringify(pick(next));
}
