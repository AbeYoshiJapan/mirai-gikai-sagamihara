"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { countUnresolvedReviewPointsForBill } from "@/features/bill-generation/server/loaders/load-generation-jobs";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { BillPublishStatus } from "../../shared/types";
import { checkPublishPreconditions } from "../../shared/utils/publish-gate";
import {
  findBillById,
  updateBillPublishStatus,
} from "../repositories/bill-repository";

export type UpdatePublishStatusResult = {
  success: boolean;
  error?: string;
};

const PUBLISH_STATUSES: BillPublishStatus[] = [
  "draft",
  "published",
  "coming_soon",
];

/**
 * 議案の公開ステータスを変える唯一の経路。
 * published にするときは公開ゲート（記事の確認済み）を確かめ、確認者・公開者を記録する。
 * DB のトリガー enforce_publish_gate でも同じ条件を守っている。
 */
export async function updatePublishStatusAction(
  formData: FormData
): Promise<UpdatePublishStatusResult> {
  try {
    const admin = await requireAdmin();

    const billId = formData.get("billId");
    const newStatus = formData.get("newStatus");

    if (typeof billId !== "string" || billId.length === 0) {
      return { success: false, error: "議案が指定されていません" };
    }
    if (
      typeof newStatus !== "string" ||
      !PUBLISH_STATUSES.includes(newStatus as BillPublishStatus)
    ) {
      return { success: false, error: "公開ステータスが不正です" };
    }

    const bill = await findBillById(billId);
    const now = new Date().toISOString();

    if (newStatus === "published") {
      const blocker = checkPublishPreconditions(bill);
      if (blocker) {
        return { success: false, error: blocker };
      }
      const unresolved = await countUnresolvedReviewPointsForBill(billId);
      if (unresolved > 0) {
        return {
          success: false,
          error: `AI 生成の「要確認」が ${unresolved} 件残っています。生成画面で確認してから公開してください`,
        };
      }
      await updateBillPublishStatus(billId, "published", {
        // 公開操作は管理者による確認でもある。確認済みにしたときの記録が無ければここで残す
        reviewed_by: bill.reviewed_by ?? admin.id,
        reviewed_at: bill.reviewed_at ?? now,
        published_by: admin.id,
        // published_at は提出日の古い別名なので触らない。公開日時は first_published_at に残す
        first_published_at: bill.first_published_at ?? now,
      });
    } else {
      await updateBillPublishStatus(billId, newStatus as BillPublishStatus, {});
    }

    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    revalidatePath("/bills");
    return { success: true };
  } catch (error) {
    console.error("Error updating publish status:", error);
    return {
      success: false,
      error: getErrorMessage(error, "ステータスの更新に失敗しました"),
    };
  }
}
