import type { BillLabelOverrides } from "@mirai-gikai/shared/bill-stage/labels";
import type { PublicSiteSettings } from "@mirai-gikai/shared/site-settings/public";

/** サイト設定の表示名を、共通語彙の上書き形に変換する */
export function toBillLabelOverrides(
  council: Pick<
    PublicSiteSettings["council"],
    "stage_labels" | "result_labels" | "in_progress_label"
  >
): BillLabelOverrides {
  return {
    stage: council.stage_labels,
    result: council.result_labels,
    inProgress: council.in_progress_label,
  };
}
