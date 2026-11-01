import {
  READER_OPINION_STATUS_LABELS,
  READER_OPINION_STATUSES,
  READER_QUESTION_STATUS_LABELS,
  READER_QUESTION_STATUSES,
} from "@mirai-gikai/shared/reader-posts/labels";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type InboxKind = "opinions" | "questions";

interface InboxTabsProps {
  kind: InboxKind;
  current: string;
  counts: Partial<Record<string, number>>;
  /** 意見・質問それぞれの未処理件数（切り替えリンクに出す） */
  pendingCounts: { opinions: number; questions: number };
  billId: string | null;
  billName?: string | null;
}

function buildHref(kind: InboxKind, status: string, billId: string | null) {
  const base =
    kind === "opinions" ? routes.readerOpinions() : routes.readerQuestions();
  const params = new URLSearchParams();
  if (status !== "received") params.set("status", status);
  if (billId) params.set("billId", billId);
  const query = params.toString();
  return (query ? `${base}?${query}` : base) as Route;
}

/** 意見／質問の切り替えと、状態ごとの絞り込みタブ */
export function InboxTabs({
  kind,
  current,
  counts,
  pendingCounts,
  billId,
  billName,
}: InboxTabsProps) {
  const statuses: readonly string[] =
    kind === "opinions" ? READER_OPINION_STATUSES : READER_QUESTION_STATUSES;
  const labels: Record<string, string> =
    kind === "opinions"
      ? READER_OPINION_STATUS_LABELS
      : READER_QUESTION_STATUS_LABELS;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["opinions", "意見", pendingCounts.opinions],
            ["questions", "質問", pendingCounts.questions],
          ] as const
        ).map(([k, label, pending]) => (
          <Link
            key={k}
            href={buildHref(k, "received", billId)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              k === kind
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            {label}
            {pending > 0 && (
              <span className="ml-1.5 rounded-full bg-white/90 px-1.5 text-xs font-bold text-blue-700">
                {pending}
              </span>
            )}
          </Link>
        ))}
        {billId && (
          <span className="ml-2 text-sm text-gray-600">
            議案で絞り込み中: {billName ?? billId}
            <Link
              href={buildHref(kind, current, null)}
              className="ml-2 text-blue-600 underline"
            >
              解除
            </Link>
          </span>
        )}
      </div>

      <nav className="flex flex-wrap gap-1 border-b">
        {[...statuses, "all"].map((status) => {
          const active = status === current;
          const count = status === "all" ? undefined : counts[status];
          return (
            <Link
              key={status}
              href={buildHref(kind, status, billId)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm",
                active
                  ? "border-blue-600 font-semibold text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {status === "all" ? "すべて" : labels[status]}
              {count !== undefined && (
                <span className="ml-1 text-xs text-gray-400">({count})</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
