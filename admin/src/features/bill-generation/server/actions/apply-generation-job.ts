"use server";

import { parseStoredExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  updateBillRecord,
  upsertBillContent,
} from "@/features/bills-edit/server/repositories/bill-edit-repository";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { findGenerationJobById } from "../repositories/generation-job-repository";
import { buildDraftContent } from "../services/generate-bill-explanation";

/**
 * 生成結果を下書き（bill_contents の normal / hard）に反映する。
 * 反映した議案はレビュー未完了に戻る（公開には管理者の確認が要る）。
 */
export async function applyGenerationJobAction(
  jobId: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();

    const job = await findGenerationJobById(jobId);
    if (!job) return { error: "生成ジョブが見つかりません" };
    if (job.status !== "succeeded") {
      return { error: "完了していない生成は反映できません" };
    }
    const explanation = parseStoredExplanation(job.output);
    if (!explanation) {
      return { error: "生成結果の形式が不正です" };
    }

    for (const difficulty of ["normal", "hard"] as const) {
      const draft = buildDraftContent(explanation, difficulty);
      await upsertBillContent({
        billId: job.bill_id,
        difficultyLevel: difficulty,
        ...draft,
        generationJobId: job.id,
        sourceHash: job.input_hash,
      });
    }

    // 新しい本文は未確認。レビュー完了を外す（トリガーが確認記録も消す）
    await updateBillRecord(job.bill_id, {
      is_review_completed: false,
      updated_at: new Date().toISOString(),
    });

    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return {};
  } catch (error) {
    console.error("Apply generation job error:", error);
    return { error: getErrorMessage(error, "下書きへの反映に失敗しました") };
  }
}
