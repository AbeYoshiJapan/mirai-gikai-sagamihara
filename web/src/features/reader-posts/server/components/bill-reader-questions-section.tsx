import Link from "next/link";
import { routes } from "@/lib/routes";
import { ReaderQuestionForm } from "../../client/components/reader-question-form";
import type { PublicReaderQuestion } from "../../shared/types";
import { ReaderFaqList } from "./reader-faq-list";
import { ReaderPostNotice } from "./reader-post-notice";

interface BillReaderQuestionsSectionProps {
  billId: string;
  questions: PublicReaderQuestion[];
  councilName: string;
  operatorName: string;
}

/**
 * 議案詳細の「この議案への質問と回答」。
 * 回答が付き、公開に同意のある質問だけを出し、その下に質問フォームを置く。
 */
export function BillReaderQuestionsSection({
  billId,
  questions,
  councilName,
  operatorName,
}: BillReaderQuestionsSectionProps) {
  return (
    <section aria-labelledby="reader-questions-heading">
      <h2
        id="reader-questions-heading"
        className="text-[22px] font-bold leading-[1.636] mb-2"
      >
        ❓ この議案への質問と回答
      </h2>
      <p className="mb-4 text-sm leading-[1.7] text-mirai-text-note">
        寄せられた質問に{operatorName}
        が回答したもののうち、公開に同意いただいたものを掲載しています。
        {questions.length === 0 && "まだ公開している質問はありません。"}
        <Link
          href={routes.questions()}
          className="ml-1 text-primary-accent underline"
        >
          すべての質問と回答
        </Link>
      </p>

      {questions.length > 0 && (
        <div className="mb-6">
          <ReaderFaqList questions={questions} />
        </div>
      )}

      <ReaderQuestionForm billId={billId} />
      <div className="mt-3">
        <ReaderPostNotice councilName={councilName} />
      </div>
    </section>
  );
}
