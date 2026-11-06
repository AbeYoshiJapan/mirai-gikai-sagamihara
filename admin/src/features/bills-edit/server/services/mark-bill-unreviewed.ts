import "server-only";

import { buildUnreviewUpdate } from "../../shared/utils/build-unreview-update";
import {
  findBillById,
  updateBillRecord,
} from "../repositories/bill-edit-repository";

/**
 * 議案を「運営者の確認前」に戻す。公開中なら公開を取り下げて下書きに戻す。
 *
 * 確認していない中身（AI 生成の反映・MCP からの書き込み）を入れる「前」に呼ぶ。
 * 先に戻しておけば、確認前の中身が一瞬でも公開ページに出ることがない。
 * DB のトリガー（enforce_publish_gate）も、公開中に確認が外れたら下書きに戻す。
 *
 * @returns 公開を取り下げたかどうか
 */
export async function markBillUnreviewed(
  billId: string
): Promise<{ unpublished: boolean }> {
  const bill = await findBillById(billId);
  const update = buildUnreviewUpdate(bill.publish_status);
  await updateBillRecord(billId, {
    ...update,
    updated_at: new Date().toISOString(),
  });
  return { unpublished: update.publish_status === "draft" };
}
