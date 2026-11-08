"use client";

import { ExternalLink } from "lucide-react";
import { useSiteSettings } from "@/lib/site-settings/provider";
import {
  formatMonthDay,
  type PlanPhase,
} from "../../../shared/utils/plan-phase";

interface PlanPhaseProgressProps {
  phase: PlanPhase;
  statusNote?: string | null;
  publicCommentStart?: string | null;
  publicCommentEnd?: string | null;
  publicCommentUrl?: string | null;
}

function buildSteps(
  municipality: string
): { phase: PlanPhase; label: string }[] {
  return [
    { phase: "opinion", label: "意見募集" },
    { phase: "public_comment", label: `${municipality}の\nパブコメ` },
    { phase: "after_public_comment", label: "計画の\n見直し" },
  ];
}

function badgeMessage(
  {
    phase,
    statusNote,
    publicCommentStart,
    publicCommentEnd,
  }: PlanPhaseProgressProps,
  municipality: string
): string {
  switch (phase) {
    case "opinion":
      return statusNote || "意見を募集しています";
    case "public_comment":
      return publicCommentEnd
        ? `${municipality}がパブリックコメントを募集中（${formatMonthDay(publicCommentEnd)}まで）`
        : `${municipality}がパブリックコメントを募集中`;
    case "after_public_comment":
      return publicCommentStart && publicCommentEnd
        ? `${municipality}のパブリックコメントは終了しました（${formatMonthDay(publicCommentStart)}〜${formatMonthDay(publicCommentEnd)}）`
        : `${municipality}のパブリックコメントは終了しました`;
  }
}

/**
 * 行政計画の段階表示。
 *
 * 議案の「提出→審査→採決」の代わりに、「意見募集→自治体のパブコメ→計画の見直し」を出す。
 * パブコメ中は自治体の募集ページへのボタンを一番目立たせる。
 */
export function PlanPhaseProgress(props: PlanPhaseProgressProps) {
  const { council } = useSiteSettings();
  const municipality = council.municipality;
  const STEPS = buildSteps(municipality);
  const { phase, publicCommentUrl } = props;
  const currentIndex = STEPS.findIndex((s) => s.phase === phase);

  return (
    <>
      <h2 className="text-[22px] font-bold mb-4">👉 計画の見直しの段階</h2>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col items-center gap-7">
          <div className="w-full max-w-md text-center bg-mirai-gradient rounded-lg px-4 py-3.5">
            <span className="text-base font-medium text-black">
              {badgeMessage(props, municipality)}
            </span>
          </div>

          <div className="relative w-full max-w-md">
            <div className="absolute top-[5.5px] left-[16%] right-[16%] h-[1px] bg-gray-300" />
            <div className="relative flex justify-around">
              {STEPS.map((step, index) => {
                const isActive = index <= currentIndex;
                const isCurrent = index === currentIndex;
                return (
                  <div key={step.phase} className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border ${
                        isActive
                          ? "bg-primary border-primary"
                          : "bg-gray-300 border-gray-300"
                      }`}
                    >
                      {isCurrent && (
                        <div className="w-5 h-5 bg-primary rounded-full -mt-[5px] -ml-[5px]" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-sm leading-6 whitespace-pre-line text-center ${
                        isActive ? "text-black" : "text-gray-300"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {phase === "opinion" && (
            <p className="w-full max-w-md text-sm leading-6 text-black">
              ここでお聞きした意見は、
              <strong>
                {municipality}の正式なパブリックコメントではありません
              </strong>
              。運営者が、{council.name}
              での質問などの参考にします。{municipality}
              がパブリックコメントを始めたら、このページで募集ページをご案内します。
            </p>
          )}

          {phase === "public_comment" && publicCommentUrl && (
            <a
              href={publicCommentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-bold text-white hover:opacity-90"
            >
              {municipality}の募集ページで意見を出す
              <ExternalLink className="size-4" />
            </a>
          )}
          {phase === "public_comment" && (
            <p className="w-full max-w-md text-sm leading-6 text-black">
              {municipality}
              のパブリックコメントの期間中は、このサイトでの意見募集は受け付けていません。ご意見は
              {municipality}の募集ページから直接お寄せください。
            </p>
          )}
        </div>
      </div>
    </>
  );
}
