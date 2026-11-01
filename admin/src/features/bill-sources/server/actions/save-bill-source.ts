"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillSource, billSourceInputSchema } from "../../shared/types";
import {
  createBillSourceRecord,
  deleteBillSourceRecord,
  updateBillSourceRecord,
} from "../repositories/bill-source-repository";

type SaveResult = { data?: BillSource; error?: string };

export async function createBillSource(
  billId: string,
  input: unknown
): Promise<SaveResult> {
  try {
    await requireAdmin();
    const parsed = billSourceInputSchema.parse(input);
    const data = await createBillSourceRecord(billId, parsed);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Create bill source error:", error);
    return { error: getErrorMessage(error, "一次資料の追加に失敗しました") };
  }
}

export async function updateBillSource(
  id: string,
  input: unknown
): Promise<SaveResult> {
  try {
    await requireAdmin();
    const parsed = billSourceInputSchema.parse(input);
    const data = await updateBillSourceRecord(id, parsed);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Update bill source error:", error);
    return { error: getErrorMessage(error, "一次資料の更新に失敗しました") };
  }
}

export async function deleteBillSource(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await deleteBillSourceRecord(id);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return {};
  } catch (error) {
    console.error("Delete bill source error:", error);
    return { error: getErrorMessage(error, "一次資料の削除に失敗しました") };
  }
}
