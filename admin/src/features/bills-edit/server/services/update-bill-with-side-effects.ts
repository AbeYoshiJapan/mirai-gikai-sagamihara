import "server-only";

import { countUnresolvedReviewPointsForBill } from "@/features/bill-generation/server/loaders/load-generation-jobs";
import { closeOtherPublicConfigs } from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
  type WebCacheTag,
} from "@/lib/utils/cache-invalidation";
import type { BillUpdateInput } from "../../shared/types";
import {
  buildUnreviewUpdate,
  type UnreviewUpdate,
} from "../../shared/utils/build-unreview-update";
import { shouldAutoCloseInterviewOnBillStage } from "../../shared/utils/should-auto-close-interview";
import {
  findBillById,
  updateBillRecord,
} from "../repositories/bill-edit-repository";

export type UpdateBillOptions = {
  /** 記事レビュー完了にした管理者。MCP など管理者以外の経路では渡さない */
  reviewerId?: string;
};

/**
 * 議案の更新と、それに伴う副作用（確認記録・確認を外したときの公開取り下げ・
 * インタビュー自動クローズ・キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の update_bill ツールから共通で呼び出す。
 * 部分更新に対応するため input は Partial で受ける（undefined フィールドは更新対象外）。
 */
export async function updateBillWithSideEffects(
  id: string,
  input: Partial<BillUpdateInput>,
  options: UpdateBillOptions = {}
) {
  const { submitted_date, decided_on, ...rest } = input;
  const definedFields = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined)
  );

  // レビュー完了にした瞬間を確認記録として残す（公開ゲートの条件）。
  // 完了を外したときは DB トリガーが reviewed_by / reviewed_at を消す。
  let reviewRecord: { reviewed_by: string | null; reviewed_at: string } | null =
    null;
  if (input.is_review_completed === true) {
    const unresolved = await countUnresolvedReviewPointsForBill(id);
    if (unresolved > 0) {
      throw new Error(
        `AI 生成の「要確認」が ${unresolved} 件残っています。生成画面で確認してからレビュー完了にしてください`
      );
    }
    const current = await findBillById(id);
    if (!current.is_review_completed || !current.reviewed_at) {
      reviewRecord = {
        reviewed_by: options.reviewerId ?? null,
        reviewed_at: new Date().toISOString(),
      };
    }
  }

  // 確認を外したときは、公開中なら公開を取り下げて下書きに戻す（公開中のものは
  // すべて運営者が確認したものに限る）。DB のトリガーも同じことをするが、ここでも明示する。
  let unreviewUpdate: UnreviewUpdate | null = null;
  if (input.is_review_completed === false) {
    const current = await findBillById(id);
    unreviewUpdate = buildUnreviewUpdate(current.publish_status);
  }

  await updateBillRecord(id, {
    ...definedFields,
    ...unreviewUpdate,
    ...(submitted_date !== undefined && {
      submitted_date: submitted_date
        ? `${submitted_date}T00:00:00+09:00`
        : null,
    }),
    ...(decided_on !== undefined && { decided_on: decided_on || null }),
    ...reviewRecord,
    updated_at: new Date().toISOString(),
  });

  const tagsToInvalidate: WebCacheTag[] = [WEB_CACHE_TAGS.BILLS];
  if (
    shouldAutoCloseInterviewOnBillStage({
      stage: input.stage,
      result: input.result,
      status: input.status,
    })
  ) {
    await closeOtherPublicConfigs(id);
    tagsToInvalidate.push(WEB_CACHE_TAGS.INTERVIEW_CONFIGS);
  }

  await invalidateWebCache(tagsToInvalidate);
}
