"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type ApplyImportResult,
  applyImportInputSchema,
} from "../../shared/types";
import {
  createImportRun,
  findBillsForImport,
  findCommitteeRefs,
  findSessionMeetingPeriods,
  finishImportRun,
  insertBillSource,
  insertDraftBill,
  updateBillFields,
  updateBillSourceText,
} from "../repositories/import-repository";
import { applyImportPlan } from "../services/apply-import-plan";
import { buildImportPreview } from "../services/build-import-preview";

/**
 * 取込を適用する。計画はサーバー側で作り直す（プレビューの改ざんを防ぐ）。
 * 作るのは下書きだけで、公開状態は変えない。実行は import_runs に記録する。
 */
export async function applyImport(input: unknown): Promise<ApplyImportResult> {
  try {
    const admin = await requireAdmin();
    const { bundleJson, sessionId, citations } =
      applyImportInputSchema.parse(input);
    const [existing, committees, meetingPeriods] = await Promise.all([
      findBillsForImport(),
      findCommitteeRefs(),
      findSessionMeetingPeriods(sessionId),
    ]);
    const built = buildImportPreview(
      bundleJson,
      sessionId,
      existing,
      committees,
      meetingPeriods
    );
    if (!built.ok) {
      return { error: built.error };
    }
    const { bundle, plan } = built;
    const runId = await createImportRun({
      sourceId: plan.mode,
      adapter: bundle.source.adapter,
      dryRun: false,
      triggeredBy: admin.id,
    });

    const summary = await applyImportPlan(
      plan,
      committees,
      {
        insertDraftBill,
        updateBillFields,
        insertBillSource,
        updateBillSourceText,
      },
      { citations }
    );
    summary.runId = runId;

    const log = [
      `会議: ${bundle.meeting.session_name ?? ""} ${bundle.meeting.label ?? ""}`.trim(),
      `追加 ${summary.created} / 更新 ${summary.updated} / 変更なし・対象外 ${summary.skipped}`,
      ...bundle.warnings.map((w) => `注意: ${w}`),
      ...summary.errors.map((e) => `エラー: ${e}`),
    ].join("\n");
    await finishImportRun({
      id: runId,
      status:
        summary.errors.length > 0 && summary.created + summary.updated === 0
          ? "failed"
          : "succeeded",
      summary: {
        added: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors.length,
      },
      log,
    });

    // 公開中の議案の段階・結果・一次資料が変わることがあるので web のキャッシュを消す
    if (summary.updated > 0) {
      await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    }
    return { success: true, summary };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Apply import error:", error);
    return { error: getErrorMessage(error, "取込の適用に失敗しました") };
  }
}
