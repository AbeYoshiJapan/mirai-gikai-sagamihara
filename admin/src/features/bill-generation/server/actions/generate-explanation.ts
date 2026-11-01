"use server";

import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { generateBillExplanation } from "../services/generate-bill-explanation";

export type GenerateExplanationActionResult =
  | { jobId: string; error?: undefined }
  | { jobId?: undefined; error: string };

const MAX_EXTRA_TEXT_CHARS = 80_000;

/**
 * 解説を生成する（generation_jobs に記録。下書きへの反映は別操作）。
 */
export async function generateExplanationAction(input: {
  billId: string;
  extraText?: string;
}): Promise<GenerateExplanationActionResult> {
  try {
    const admin = await requireAdmin();
    if (!input.billId) {
      return { error: "議案が指定されていません" };
    }
    const extraText = (input.extraText ?? "").slice(0, MAX_EXTRA_TEXT_CHARS);

    const result = await generateBillExplanation({
      billId: input.billId,
      extraText: extraText || null,
      createdBy: admin.id,
    });
    if ("error" in result) {
      return { error: result.error };
    }
    return { jobId: result.jobId };
  } catch (error) {
    console.error("Generate explanation error:", error);
    return { error: getErrorMessage(error, "生成中にエラーが発生しました") };
  }
}
