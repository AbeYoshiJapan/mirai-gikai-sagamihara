import {
  COUNCIL_QUESTION_KIND_LABELS,
  type NoticeItem,
} from "@mirai-gikai/shared/council-questions/types";
import Link from "next/link";
import { routes } from "@/lib/routes";
import type { PublicCouncilQuestion } from "../../shared/types";
import { formatQuestionDate } from "../../shared/utils/question-views";

/** 項目の木。番号は通告一覧のまま */
export function QuestionItemTree({
  items,
  nested = false,
}: {
  items: NoticeItem[];
  nested?: boolean;
}) {
  return (
    <ol
      className={
        nested ? "mt-1 ml-6 flex flex-col gap-1" : "flex flex-col gap-2"
      }
    >
      {items.map((item) => (
        <li key={`${item.label}-${item.text}`} className="leading-7">
          <span className="mr-2 font-bold">{item.label}</span>
          <span>{item.text}</span>
          {item.children.length > 0 && (
            <QuestionItemTree items={item.children} nested />
          )}
        </li>
      ))}
    </ol>
  );
}

/** 一覧に出す 1 人分。全員を同じ形式で出す（運営者本人も「運営者」と添えるだけ） */
export function QuestionSummaryCard({
  question,
  isOperator,
  showMeeting = false,
}: {
  question: PublicCouncilQuestion;
  isOperator: boolean;
  showMeeting?: boolean;
}) {
  const detailHref = routes.councilQuestionDetail(
    question.meeting_key,
    question.id
  );
  return (
    <article className="rounded-2xl bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-mirai-text-secondary">
          順位{question.order_no}
        </span>
        <h3 className="text-lg font-bold">
          <Link href={detailHref} className="hover:underline">
            {question.member_name}
          </Link>
        </h3>
        {question.faction_label && (
          <span className="text-sm text-mirai-text-secondary">
            （{question.faction_label}）
          </span>
        )}
        {question.method && (
          <span className="rounded-full bg-mirai-surface-muted px-2 py-0.5 text-xs text-mirai-text-secondary">
            {question.method}
          </span>
        )}
        {isOperator && (
          <span className="rounded-full border border-primary px-2 py-0.5 text-xs text-primary">
            運営者
          </span>
        )}
      </div>
      {showMeeting && (
        <p className="mt-1 text-xs text-mirai-text-secondary">
          {question.meeting_name}・{COUNCIL_QUESTION_KIND_LABELS[question.kind]}
          {question.question_date &&
            `・${formatQuestionDate(question.question_date)}`}
        </p>
      )}
      <ol className="mt-3 flex flex-col gap-1 text-[15px]">
        {question.items.map((item) => (
          <li key={`${item.label}-${item.text}`} className="leading-7">
            <span className="mr-2 font-bold">{item.label}</span>
            {item.text}
          </li>
        ))}
      </ol>
      <Link
        href={detailHref}
        className="mt-3 inline-block text-sm font-bold text-primary underline underline-offset-2"
      >
        細目まで見る
      </Link>
    </article>
  );
}

/** どのページにも出す、載せ方の説明 */
export function QuestionsNote({ hasOperator }: { hasOperator: boolean }) {
  return (
    <div className="rounded-2xl bg-mirai-surface-light px-5 py-4 text-sm leading-6 text-mirai-text-secondary">
      <p>
        議会が公表する通告一覧をもとに、全議員の質問を公式の順番・同じ形式で載せています。
        項目は通告の文言のままです（このサイトで言い換えていません）。
      </p>
      <p className="mt-2">
        通告は質問の予定です。時間の都合などで、質問されない項目もあります。答弁は、中継の録画と会議録でご確認ください。
      </p>
      {hasOperator && (
        <p className="mt-2">
          このサイトの運営者（議員）本人の質問には「運営者」と添えています。ほかの議員と同じ形式で載せています。
        </p>
      )}
    </div>
  );
}
