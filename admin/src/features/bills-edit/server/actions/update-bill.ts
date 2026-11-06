"use server";

import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillUpdateInput, billUpdateSchema } from "../../shared/types";
import { updateBillWithSideEffects } from "../services/update-bill-with-side-effects";

export async function updateBill(id: string, input: BillUpdateInput) {
  try {
    const admin = await requireAdmin();
    // 記事の確認はボタン（article-confirmation）だけで変える。フォームの保存では触らない
    const { is_review_completed: _ignored, ...validatedData } =
      billUpdateSchema.parse(input);
    await updateBillWithSideEffects(id, validatedData, {
      reviewerId: admin.id,
    });
  } catch (error) {
    console.error("Update bill error:", error);
    throw new Error(
      getErrorMessage(error, "議案の更新中にエラーが発生しました")
    );
  }
}
