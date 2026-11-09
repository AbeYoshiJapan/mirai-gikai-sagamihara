import Link from "next/link";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { PublicReaderQuestion } from "../../shared/types";
import { INQUIRY_KIND_TEXTS } from "../../shared/utils/inquiry-texts";
import { ReaderPostMarkdown } from "./reader-post-markdown";

interface ReaderFaqListProps {
  questions: PublicReaderQuestion[];
  /** 議案名へのリンクを出す（サイト全体の一覧で使う） */
  showBillLink?: boolean;
}

/** 公開中の質問と回答の一覧 */
export function ReaderFaqList({
  questions,
  showBillLink = false,
}: ReaderFaqListProps) {
  if (questions.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {questions.map((question) => (
        <li
          key={question.id}
          className="rounded-lg border bg-white px-4 py-3.5"
        >
          {showBillLink && question.bill_id && question.bill_name && (
            <Link
              href={routes.billDetail(question.bill_id)}
              className="mb-1 inline-block text-xs text-primary-accent underline"
            >
              {question.bill_name}
            </Link>
          )}
          <div className="flex gap-2">
            <span className="shrink-0 text-sm font-bold text-mirai-text">
              {INQUIRY_KIND_TEXTS[question.kind].postMark}
            </span>
            <p className="whitespace-pre-wrap break-words text-sm font-bold leading-[1.8] text-mirai-text">
              {question.question}
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <span className="shrink-0 text-sm font-bold text-mirai-text-subtle">
              {INQUIRY_KIND_TEXTS[question.kind].replyMark}
            </span>
            <div className="min-w-0 flex-1">
              <ReaderPostMarkdown markdown={question.answer_md} />
            </div>
          </div>
          {question.published_at && (
            <p className="mt-2 text-right text-xs text-mirai-text-subtle">
              {formatDateWithDots(question.published_at)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
