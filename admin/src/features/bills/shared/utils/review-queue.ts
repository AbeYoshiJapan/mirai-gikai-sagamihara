import type { BillPublishStatus } from "../types";

export type ReviewQueueSummary = {
  published: number;
  /** 公開されておらず、レビューも終わっていない（確認待ち） */
  awaitingReview: number;
  /** レビュー済みだがまだ公開していない */
  reviewedUnpublished: number;
};

/**
 * 管理画面の「未確認 N 件」の集計。取込や生成で入った下書きがどれだけ確認待ちかを示す。
 */
export function summarizeReviewQueue(
  bills: readonly {
    publish_status: BillPublishStatus;
    is_review_completed: boolean;
  }[]
): ReviewQueueSummary {
  const summary: ReviewQueueSummary = {
    published: 0,
    awaitingReview: 0,
    reviewedUnpublished: 0,
  };
  for (const bill of bills) {
    if (bill.publish_status === "published") {
      summary.published += 1;
    } else if (bill.is_review_completed) {
      summary.reviewedUnpublished += 1;
    } else {
      summary.awaitingReview += 1;
    }
  }
  return summary;
}
