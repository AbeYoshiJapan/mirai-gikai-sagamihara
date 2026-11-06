import type { DeliberationTiming } from "@mirai-gikai/shared/bill-stage/deliberation-timing";
import {
  type BillLabelOverrides,
  type BillStageInfo,
  getBillDateLabel,
  getBillOutcomeLabel,
  getBillOutcomeVariant,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { Bill } from "../types";

/** 表示の判定に使う列だけ */
export type BillStageFields = Pick<
  Bill,
  "bill_kind" | "stage" | "result" | "vote_outcome"
>;

export function toStageInfo(bill: BillStageFields): BillStageInfo {
  return {
    bill_kind: bill.bill_kind,
    stage: bill.stage,
    result: bill.result,
    vote_outcome: bill.vote_outcome,
  };
}

/**
 * カード用の短い審議状況ラベル。サイト設定の表示名で上書きできる。
 * 結論が出ていない議案は、時期（timing）で「審議中」「継続中」「審議予定」を出し分ける。
 */
export function getCardStatusLabel(
  bill: BillStageFields,
  overrides?: BillLabelOverrides,
  timing?: DeliberationTiming | null
): string {
  return getBillOutcomeLabel(toStageInfo(bill), overrides, timing);
}

/** ステータスに対応するBadgeのvariantを取得 */
export function getStatusVariant(
  bill: BillStageFields
): "light" | "default" | "dark" | "muted" {
  return getBillOutcomeVariant(toStageInfo(bill));
}

/** 日付の後ろに付ける言葉。議案は「提出」、委員会報告は「報告」、特別委員会は「開催」。 */
export function getDateLabel(bill: Pick<Bill, "bill_kind">): string {
  return getBillDateLabel(bill.bill_kind);
}
