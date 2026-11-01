"use client";

import { getBillDecisionLabel } from "@mirai-gikai/shared/bill-stage/labels";
import { toBillLabelOverrides } from "@/lib/site-settings/bill-labels";
import { useSiteSettings } from "@/lib/site-settings/provider";
import {
  calculateProgressWidth,
  getCurrentStep,
  getStatusMessage,
  getStepState,
  PROGRESS_STEPS,
} from "../../../shared/utils/bill-progress";
import {
  type BillStageFields,
  toStageInfo,
} from "../../../shared/utils/bill-status";

interface BillStatusProgressProps {
  bill: BillStageFields & { committee_name?: string | null };
  statusNote?: string | null;
}

interface StatusBadgeProps {
  message: string;
}

interface ProgressStepProps {
  label: string;
  stepNumber: number;
  currentStep: number;
  isActive: boolean;
  isPreparing: boolean;
}

// ステータスバッジコンポーネント
function StatusBadge({ message }: StatusBadgeProps) {
  if (!message) return null;

  return (
    <div className="w-full max-w-md relative">
      <div className="w-full text-center bg-mirai-gradient rounded-lg px-4 py-3.5">
        <span className="text-base font-medium text-black">{message}</span>
      </div>
      {/* 下向き三角形 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: "7.5px solid transparent",
          borderRight: "7.5px solid transparent",
          borderTop: "7.5px solid var(--color-mirai-progress-fill)",
        }}
      />
    </div>
  );
}

// プログレスステップコンポーネント
function ProgressStep({
  label,
  stepNumber,
  currentStep,
  isActive,
  isPreparing,
}: ProgressStepProps) {
  const isCurrentStep = isActive && stepNumber === currentStep;

  return (
    <div className="flex flex-col items-center">
      {/* ドット */}
      <div
        className={`w-3 h-3 rounded-full border transition-all duration-300 ${
          isActive ? "bg-primary border-primary" : "bg-gray-300 border-gray-300"
        }`}
      >
        {/* 現在のステップを強調 */}
        {isCurrentStep && (
          <div className="w-5 h-5 bg-primary rounded-full -mt-[5px] -ml-[5px]" />
        )}
      </div>

      {/* ラベル */}
      <div className="mt-2">
        <span
          className={`flex flex-col text-sm leading-6 whitespace-pre-line text-center ${
            isActive && !isPreparing ? "text-black" : "text-gray-300"
          } font-normal`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function BillStatusProgress({
  bill,
  statusNote,
}: BillStatusProgressProps) {
  const { council } = useSiteSettings();
  const overrides = toBillLabelOverrides(council);
  const currentStep = getCurrentStep(bill);

  // 委員会報告・特別委員会は採決がないので、進捗ではなく補足だけを示す
  if (currentStep === null) {
    const heading =
      bill.bill_kind === "report"
        ? "👉 委員会への報告"
        : bill.bill_kind === "special_committee"
          ? "👉 特別委員会の調査"
          : "👉 現在の状況";
    return (
      <>
        <h2 className="text-[22px] font-bold mb-4">{heading}</h2>
        <div className="bg-white rounded-lg border p-6 flex justify-center">
          <StatusBadge
            message={
              statusNote ||
              (bill.bill_kind === "report" ? "委員会報告" : "特別委員会")
            }
          />
        </div>
      </>
    );
  }

  const isPreparing = currentStep === 0;
  const progressWidth = calculateProgressWidth(currentStep);
  const decision = getBillDecisionLabel(toStageInfo(bill), overrides);
  const committeeNote =
    bill.committee_name && currentStep >= 2 && currentStep < 5
      ? `${bill.committee_name}に付託`
      : null;
  const statusMessage =
    getStatusMessage(bill, statusNote) || decision || committeeNote || "";

  return (
    <>
      <h2 className="text-[22px] font-bold mb-4">👉 審議のステータス</h2>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col items-center gap-7">
          {/* ステータスメッセージバッジ */}
          <StatusBadge message={statusMessage} />

          {/* プログレスライン */}
          <div className="relative w-full max-w-md">
            {/* 背景ライン */}
            <div className="absolute top-[5.5px] left-0 w-full h-[1px] bg-gray-300" />

            {/* アクティブライン */}
            {!isPreparing && currentStep > 0 && (
              <div
                className="absolute top-[5px] left-0 h-0.5 bg-primary transition-all duration-300"
                style={{ width: `${Math.min(progressWidth, 100)}%` }}
              />
            )}

            {/* ステップドット */}
            <div className="relative flex justify-around">
              {PROGRESS_STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isActive =
                  getStepState(stepNumber, currentStep, isPreparing) ===
                  "active";

                return (
                  <ProgressStep
                    key={step.stage}
                    label={
                      step.stage === "decided" && decision
                        ? decision.replace(/（.*）$/, "")
                        : step.label
                    }
                    stepNumber={stepNumber}
                    currentStep={currentStep}
                    isActive={isActive}
                    isPreparing={isPreparing}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
