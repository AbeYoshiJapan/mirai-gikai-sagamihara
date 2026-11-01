import Image from "next/image";
import { Card } from "@/components/ui/card";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillWithContent } from "../../../shared/types";
import { getArticleReviewState } from "../../../shared/utils/article-review-state";
import { getDateLabel } from "../../../shared/utils/bill-status";
import { ReviewCompleteBadge } from "../bill-detail/review-status-banner";
import { BillStatusBadge } from "./bill-status-badge";

interface CompactBillCardProps {
  bill: BillWithContent;
  className?: string;
}

/**
 * コンパクトな水平レイアウトの法案カード
 * 過去国会セクションや過去国会議案一覧ページで使用
 */
export function CompactBillCard({ bill, className }: CompactBillCardProps) {
  const displayTitle = bill.bill_content?.title || bill.name;
  // 議会年度の一覧では可決済みの議案も提出日で並ぶので、日付には提出・報告などを付ける
  const statusLabel = getDateLabel(bill);

  return (
    <Card
      className={`border border-black shadow-none hover:bg-muted/50 transition-colors overflow-hidden ${className ?? ""}`}
    >
      <div className="flex">
        {/* コンテンツエリア */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          <h3 className="font-bold text-[15px] leading-[1.6] line-clamp-2">
            {displayTitle}
            {getArticleReviewState(bill) === "reviewed" && (
              <>
                {" "}
                <ReviewCompleteBadge size={14} top="1px" />
              </>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <BillStatusBadge bill={bill} className="w-fit" />
            {bill.submitted_date && (
              <span className="text-xs text-muted-foreground">
                {formatDateWithDots(bill.submitted_date)} {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* サムネイル画像 */}
        {bill.thumbnail_url && (
          <div className="relative w-24 h-16 flex-shrink-0 self-center mr-4 rounded-lg overflow-hidden">
            <Image
              src={bill.thumbnail_url}
              alt={bill.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
