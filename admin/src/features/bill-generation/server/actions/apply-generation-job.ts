"use server";

import { parseStoredExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { upsertBillContent } from "@/features/bills-edit/server/repositories/bill-edit-repository";
import { markBillUnreviewed } from "@/features/bills-edit/server/services/mark-bill-unreviewed";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { findGenerationJobById } from "../repositories/generation-job-repository";
import { buildDraftContent } from "../services/generate-bill-explanation";

export type ApplyGenerationJobResult = {
  error?: string;
  /** 公開中だった議案を、確認し直すために下書きへ戻したか */
  unpublished?: boolean;
};

/**
 * 生成結果を下書き（bill_contents の normal / hard）に反映する。
 *
 * 反映した本文は運営者の確認前なので、議案はレビュー未完了に戻る。公開中だった
 * 議案は公開を取り下げて下書きに戻り、確認・公開をやり直すまで公開サイトに出ない。
 * 本文を書き換える「前」に確認を外す（順序が逆だと、確認前の本文が一瞬でも
 * 公開ページに出うる）。
 */
export async function applyGenerationJobAction(
  jobId: string
): Promise<ApplyGenerationJobResult> {
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

    const { unpublished } = await markBillUnreviewed(job.bill_id);

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

    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    return { unpublished };
  } catch (error) {
    console.error("Apply generation job error:", error);
    return { error: getErrorMessage(error, "下書きへの反映に失敗しました") };
  }
}
