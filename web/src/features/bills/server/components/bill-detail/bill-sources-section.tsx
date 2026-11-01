import { BILL_SOURCE_KIND_LABELS } from "@mirai-gikai/shared/bill-sources/labels";
import { ExternalLink, FileText } from "lucide-react";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillSourceItem } from "../../../shared/types";

interface BillSourcesSectionProps {
  sources: BillSourceItem[];
  /** bills.bill_document_url。一次資料に議案書が無ければ先頭に出す */
  billDocumentUrl: string | null;
  primarySourceLabel: string;
}

/**
 * 議案詳細の「一次資料」。議会サイトの議案書・会議録・審議結果・中継へのリンク。
 * 解説の根拠を利用者が自分で確かめられるようにする。
 */
export function BillSourcesSection({
  sources,
  billDocumentUrl,
  primarySourceLabel,
}: BillSourcesSectionProps) {
  const hasBillPdf = sources.some((s) => s.kind === "bill_pdf");
  const items: BillSourceItem[] = [
    ...(billDocumentUrl && !hasBillPdf
      ? [
          {
            id: "bill-document",
            kind: "bill_pdf" as const,
            url: billDocumentUrl,
            label: "",
            meeting_date: null,
            sort_order: -1,
          },
        ]
      : []),
    ...sources,
  ];

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="bill-sources-heading">
      <h2
        id="bill-sources-heading"
        className="text-[22px] font-bold leading-[1.636] mb-4"
      >
        📄 一次資料
      </h2>
      <div className="bg-white rounded-lg border divide-y">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <FileText className="h-5 w-5 shrink-0 text-gray-500" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-black">
                {item.label || BILL_SOURCE_KIND_LABELS[item.kind]}
              </div>
              <div className="text-xs text-mirai-text-note">
                {BILL_SOURCE_KIND_LABELS[item.kind]}
                {item.meeting_date
                  ? ` ・ ${formatDateWithDots(item.meeting_date)}`
                  : ""}
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-mirai-text-note">
        {primarySourceLabel}へのリンクです。正確な内容はこちらでご確認ください。
      </p>
    </section>
  );
}
