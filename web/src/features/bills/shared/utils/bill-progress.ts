import {
  BILL_PROGRESS_STEPS,
  getBillProgressStep,
  isDeliberationKind,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { BillStageFields } from "./bill-status";
import { toStageInfo } from "./bill-status";

/** 進捗バーの段階（提出 → 委員会付託 → 委員会審査 → 本会議 → 議決） */
export const PROGRESS_STEPS = BILL_PROGRESS_STEPS.map((step) => ({
  stage: step.stage,
  label: step.label,
}));

/** 各段階のバーの長さ（0〜1）。最後の段階で 1 になる */
const PROGRESS_RATIOS = [0, 1 / 10, 3 / 10, 5 / 10, 7 / 10, 1] as const;

/**
 * ステータスメッセージ。補足があればそれ、提出前なら「提出前」
 */
export function getStatusMessage(
  bill: BillStageFields,
  statusNote: string | null | undefined
): string {
  if (!isDeliberationKind(bill.bill_kind)) return statusNote || "";
  if (bill.stage === null || bill.stage === "preparing") {
    return statusNote || "提出前";
  }
  return statusNote || "";
}

/**
 * ステップ番号と現在のステップからステップの状態を判定する
 */
export function getStepState(
  stepNumber: number,
  currentStep: number,
  isPreparing: boolean
): "active" | "inactive" {
  if (isPreparing) return "inactive";
  return stepNumber <= currentStep ? "active" : "inactive";
}

/**
 * 現在のステップからプログレスバーの幅(%)を計算する
 */
export function calculateProgressWidth(currentStep: number): number {
  const ratio = PROGRESS_RATIOS[currentStep] ?? 0;
  return ratio * 100;
}

/**
 * 現在のステップ（0 = 提出前、1〜5）。審議の流れに乗らない種類は null
 */
export function getCurrentStep(bill: BillStageFields): number | null {
  return getBillProgressStep(toStageInfo(bill));
}
