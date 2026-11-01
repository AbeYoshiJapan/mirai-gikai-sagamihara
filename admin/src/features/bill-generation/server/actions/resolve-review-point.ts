"use server";

import { parseStoredExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  findGenerationJobById,
  markGenerationJobReviewed,
  updateGenerationJobOutput,
} from "../repositories/generation-job-repository";

/**
 * 「要確認」の 1 項目を確認済み／未確認に切り替える。全部解消したら確認者を記録する。
 */
export async function resolveReviewPointAction(input: {
  jobId: string;
  index: number;
  resolved: boolean;
  note?: string;
}): Promise<{ error?: string; unresolved?: number }> {
  try {
    const admin = await requireAdmin();

    const job = await findGenerationJobById(input.jobId);
    if (!job) return { error: "生成ジョブが見つかりません" };
    const explanation = parseStoredExplanation(job.output);
    if (!explanation) return { error: "生成結果の形式が不正です" };
    const point = explanation.needs_review[input.index];
    if (!point) return { error: "指定された要確認項目がありません" };

    explanation.needs_review[input.index] = {
      ...point,
      resolved: input.resolved,
      resolved_note: (input.note ?? point.resolved_note ?? "").slice(0, 300),
    };
    await updateGenerationJobOutput({ jobId: job.id, output: explanation });

    const unresolved = explanation.needs_review.filter(
      (p) => !p.resolved
    ).length;
    if (unresolved === 0) {
      await markGenerationJobReviewed({ jobId: job.id, reviewedBy: admin.id });
    }
    return { unresolved };
  } catch (error) {
    console.error("Resolve review point error:", error);
    return { error: getErrorMessage(error, "確認の記録に失敗しました") };
  }
}
