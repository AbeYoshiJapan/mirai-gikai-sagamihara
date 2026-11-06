"use server";

import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { updateBillWithSideEffects } from "../services/update-bill-with-side-effects";

const billIdSchema = z.string().uuid();
const INVALID_BILL_ID = { error: "議案IDが不正です" };

/**
 * 「記事を確認しました」ボタン。運営者が記事（解説）を一次資料と照らして確かめたという
 * 意思表示として、確認した人と日時を記録する。確認済みの議案だけが公開できる。
 */
export async function confirmBillArticle(
  billId: string
): Promise<{ error?: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = billIdSchema.safeParse(billId);
    if (!parsed.success) return INVALID_BILL_ID;
    await updateBillWithSideEffects(
      parsed.data,
      { is_review_completed: true },
      { reviewerId: admin.id }
    );
    return {};
  } catch (error) {
    console.error("Confirm bill article error:", error);
    return {
      error: getErrorMessage(error, "記事の確認を記録できませんでした"),
    };
  }
}

/** 確認を取り消す。公開中なら公開を取り下げて下書きに戻す */
export async function revokeBillArticleConfirmation(
  billId: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const parsed = billIdSchema.safeParse(billId);
    if (!parsed.success) return INVALID_BILL_ID;
    await updateBillWithSideEffects(parsed.data, {
      is_review_completed: false,
    });
    return {};
  } catch (error) {
    console.error("Revoke bill article confirmation error:", error);
    return {
      error: getErrorMessage(error, "確認を取り消せませんでした"),
    };
  }
}
