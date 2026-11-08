"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { PR_SOURCE_TYPES } from "../../shared/types";
import {
  deletePrPostLog,
  insertPrPostLog,
} from "../repositories/pr-repository";

const recordSchema = z.object({
  sourceType: z.enum(PR_SOURCE_TYPES),
  sourceId: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
});

/** X などに投稿したことを記録する（投稿そのものは運営者が自分で行う） */
export async function recordPrPostAction(
  input: z.input<typeof recordSchema>
): Promise<{ ok: true } | { error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = recordSchema.safeParse(input);
    if (!parsed.success) return { error: "記録する内容が正しくありません" };
    await insertPrPostLog({ ...parsed.data, postedBy: admin.id });
    revalidatePath(routes.pr());
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, "投稿の記録に失敗しました") };
  }
}

/** 投稿の記録を取り消す（記録を付け間違えたとき） */
export async function deletePrPostLogAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) {
      return { error: "記録が見つかりません" };
    }
    await deletePrPostLog(id);
    revalidatePath(routes.pr());
    return { ok: true };
  } catch (error) {
    return { error: getErrorMessage(error, "記録の取り消しに失敗しました") };
  }
}
