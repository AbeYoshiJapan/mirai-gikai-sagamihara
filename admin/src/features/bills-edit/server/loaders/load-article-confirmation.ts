import "server-only";

import { findAdminUsers } from "@/features/admins/server/repositories/admin-repository";
import { countUnresolvedReviewPointsForBill } from "@/features/bill-generation/server/loaders/load-generation-jobs";
import { formatJstDateTime } from "@/features/interview-reports/shared/utils/format-jst-date-time";
import type { Bill } from "../../shared/types";
import type { ArticleConfirmationState } from "../../shared/types/article-confirmation";

/** 「記事の確認」欄に出す状態 */
export async function loadArticleConfirmation(
  bill: Pick<Bill, "id" | "is_review_completed" | "reviewed_at" | "reviewed_by">
): Promise<ArticleConfirmationState> {
  if (bill.is_review_completed) {
    let confirmedBy: string | null = null;
    if (bill.reviewed_by) {
      try {
        const admins = await findAdminUsers();
        confirmedBy =
          admins?.find((admin) => admin.id === bill.reviewed_by)?.email ?? null;
      } catch (error) {
        // 表示のためだけなので、分からなければ名前を出さない
        console.error("Failed to load reviewer:", error);
      }
    }
    return {
      confirmed: true,
      confirmedAtLabel: bill.reviewed_at
        ? formatJstDateTime(bill.reviewed_at)
        : null,
      confirmedBy,
      unresolvedCount: 0,
    };
  }

  let unresolvedCount = 0;
  try {
    unresolvedCount = await countUnresolvedReviewPointsForBill(bill.id);
  } catch (error) {
    // 数えられなくても、押したときにサーバー側でもう一度確かめる
    console.error("Failed to count unresolved review points:", error);
  }
  return {
    confirmed: false,
    confirmedAtLabel: null,
    confirmedBy: null,
    unresolvedCount,
  };
}
