"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type Committee, committeeInputSchema } from "../../shared/types";
import {
  createCommitteeRecord,
  deleteCommitteeRecord,
  updateCommitteeRecord,
} from "../repositories/committee-repository";

type SaveResult = { data?: Committee; error?: string };

export async function createCommittee(input: unknown): Promise<SaveResult> {
  try {
    await requireAdmin();
    const parsed = committeeInputSchema.parse(input);
    const data = await createCommitteeRecord(parsed);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Create committee error:", error);
    return { error: getErrorMessage(error, "委員会の作成に失敗しました") };
  }
}

export async function updateCommittee(
  id: string,
  input: unknown
): Promise<SaveResult> {
  try {
    await requireAdmin();
    const parsed = committeeInputSchema.parse(input);
    const data = await updateCommitteeRecord(id, parsed);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Update committee error:", error);
    return { error: getErrorMessage(error, "委員会の更新に失敗しました") };
  }
}

export async function deleteCommittee(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await deleteCommitteeRecord(id);
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return {};
  } catch (error) {
    console.error("Delete committee error:", error);
    return { error: getErrorMessage(error, "委員会の削除に失敗しました") };
  }
}
