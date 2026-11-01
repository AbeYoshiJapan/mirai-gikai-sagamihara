"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
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
 * published にするときは公開ゲート（レビュー完了）を確認し、確認者・公開者を記録する。
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
      await updateBillPublishStatus(billId, "published", {
        // 公開操作は管理者による確認でもある。レビュー完了時の記録が無ければここで残す
        reviewed_by: bill.reviewed_by ?? admin.id,
        reviewed_at: bill.reviewed_at ?? now,
        published_by: admin.id,
        published_at: bill.published_at ?? now,
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
