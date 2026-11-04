"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type PreviewImportResult,
  previewImportInputSchema,
} from "../../shared/types";
import {
  findBillsForImport,
  findCommitteeRefs,
} from "../repositories/import-repository";
import { buildImportPreview } from "../services/build-import-preview";

/** 取込 JSON を既存の議案と突き合わせ、何が変わるかを返す。DB には書かない */
export async function previewImport(
  input: unknown
): Promise<PreviewImportResult> {
  try {
    await requireAdmin();
    const { bundleJson, sessionId } = previewImportInputSchema.parse(input);
    const [existing, committees] = await Promise.all([
      findBillsForImport(),
      findCommitteeRefs(),
    ]);
    const result = buildImportPreview(
      bundleJson,
      sessionId,
      existing,
      committees
    );
    if (!result.ok) {
      return { error: result.error };
    }
    return { success: true, preview: result.preview };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Preview import error:", error);
    return { error: getErrorMessage(error, "取込の確認に失敗しました") };
  }
}
