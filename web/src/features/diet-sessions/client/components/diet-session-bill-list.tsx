"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { BillWithContent } from "@/features/bills/shared/types";
import type { CouncilPeriod } from "@/features/council-meetings/shared/types";
import { useSiteSettings } from "@/lib/site-settings/provider";
import type { DietSession } from "../../shared/types";
import { formatSessionPeriod } from "../../shared/utils/format-session-period";
import { BillListWithStatusFilter } from "./bill-list-with-status-filter";

type Props = {
  session: DietSession;
  bills: BillWithContent[];
  periods?: CouncilPeriod[];
};

export function DietSessionBillList({ session, bills, periods }: Props) {
  const { council } = useSiteSettings();
  const sessionDescription = `${formatSessionPeriod(session.start_date, session.end_date)}（通年）。議案・委員会報告・特別委員会の調査を、議会期間ごとに並べています`;

  return (
    <div className="flex flex-col gap-8">
      {/* Archiveヘッダー */}
      <div className="flex flex-col gap-1">
        <h1>
          <Image
            src="/icons/archive-typography.svg"
            alt="Archive"
            width={156}
            height={36}
            priority
          />
        </h1>
        <p className="text-sm font-bold text-primary-accent">
          議会年度ごとの議案・報告
        </p>
      </div>

      {/* セクションヘッダー */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[22px] font-bold text-black leading-[1.48] flex items-center gap-4">
          {session.name}
          <span>{bills.length}件</span>
        </h2>
        <p className="text-xs font-medium text-mirai-text">
          {sessionDescription}
        </p>
      </div>

      {/* フィルター付き法案リスト */}
      {bills.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          この会期の議案はまだありません
        </p>
      ) : (
        <BillListWithStatusFilter bills={bills} periods={periods} />
      )}

      {/* 議会サイトの会議録へのリンク */}
      {session.shugiin_url && (
        <div className="flex items-center gap-1 text-[13px] font-medium text-mirai-text">
          {session.name}の会議の記録は
          <a
            href={session.shugiin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            {council.name}の会議録検索へ
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
