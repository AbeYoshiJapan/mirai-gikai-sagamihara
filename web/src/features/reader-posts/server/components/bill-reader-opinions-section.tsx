import {
  formatReaderOpinionAttributes,
  getReaderDisplayName,
  READER_OPINION_STANCE_LABELS,
  type ReaderOpinionStance,
} from "@mirai-gikai/shared/reader-posts/labels";
import { cn } from "@/lib/utils";
import { formatDateWithDots } from "@/lib/utils/date";
import { ReaderOpinionForm } from "../../client/components/reader-opinion-form";
import type { PublicReaderOpinion } from "../../shared/types";
import { ReaderPostMarkdown } from "./reader-post-markdown";
import { ReaderPostNotice } from "./reader-post-notice";

const STANCE_BADGE_CLASS: Record<ReaderOpinionStance, string> = {
  for: "bg-mirai-brand-mint text-mirai-text",
  against: "bg-[#fde2e7] text-mirai-text",
  neutral: "bg-mirai-surface-muted text-mirai-text",
  unsure: "bg-mirai-surface-muted text-mirai-text-subtle",
};

interface BillReaderOpinionsSectionProps {
  billId: string;
  opinions: PublicReaderOpinion[];
  municipality: string;
  councilName: string;
}

/**
 * 議案詳細の「この議案への意見」。
 * 公開に同意があり、管理者が確認して公開した意見だけを出し、その下に投稿フォームを置く。
 */
export function BillReaderOpinionsSection({
  billId,
  opinions,
  municipality,
  councilName,
}: BillReaderOpinionsSectionProps) {
  return (
    <section aria-labelledby="reader-opinions-heading">
      <h2
        id="reader-opinions-heading"
        className="text-[22px] font-bold leading-[1.636] mb-2"
      >
        ✉️ この議案への意見
      </h2>
      <p className="mb-4 text-sm leading-[1.7] text-mirai-text-note">
        寄せられた意見のうち、公開に同意いただき、運営者が内容を確認したものを掲載しています。
      </p>

      {opinions.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {opinions.map((opinion) => {
            const attributes = formatReaderOpinionAttributes(
              opinion.attributes,
              municipality
            );
            return (
              <li
                key={opinion.id}
                className="rounded-lg border bg-white px-4 py-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mirai-text-subtle">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      STANCE_BADGE_CLASS[opinion.stance]
                    )}
                  >
                    {READER_OPINION_STANCE_LABELS[opinion.stance]}
                  </span>
                  <span className="font-medium text-mirai-text">
                    {getReaderDisplayName(opinion.display_name)}
                  </span>
                  {attributes && <span>{attributes}</span>}
                  {opinion.published_at && (
                    <span>{formatDateWithDots(opinion.published_at)}</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-[1.8] text-mirai-text">
                  {opinion.body}
                </p>
                {opinion.reply_md.trim().length > 0 && (
                  <div className="mt-3 rounded-md bg-mirai-surface px-3 py-2.5">
                    <p className="mb-1 text-xs font-bold text-mirai-text-subtle">
                      運営者からの返信
                    </p>
                    <ReaderPostMarkdown markdown={opinion.reply_md} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ReaderOpinionForm billId={billId} municipality={municipality} />
      <div className="mt-3">
        <ReaderPostNotice councilName={councilName} />
      </div>
    </section>
  );
}
