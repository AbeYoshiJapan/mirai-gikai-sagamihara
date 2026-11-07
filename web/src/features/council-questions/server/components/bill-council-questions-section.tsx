import {
  COUNCIL_QUESTION_KIND_LABELS,
  extractBillRefs,
  type NoticeItem,
} from "@mirai-gikai/shared/council-questions/types";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { isOperatorQuestion } from "../../shared/utils/question-views";
import { getBillQuestions } from "../loaders/council-question-loaders";

/** 大きな項目のうち、その中（細目まで）にこの議案の番号が出てくるもの */
function itemsMentioning(items: NoticeItem[], ref: string): NoticeItem[] {
  const mentions = (item: NoticeItem): boolean =>
    extractBillRefs(item.text).includes(ref) || item.children.some(mentions);
  return items.filter(mentions);
}

/** 議案のページの「この議案を取り上げた議会での質問」。通告一覧に番号が出てくる質問だけ */
export async function BillCouncilQuestionsSection({
  billNumber,
}: {
  billNumber: string;
}) {
  const [{ operator }, data] = await Promise.all([
    getSiteSettings(),
    getBillQuestions(billNumber),
  ]);
  if (!data || data.questions.length === 0) return null;
  const { ref, questions } = data;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">この議案を取り上げた議会での質問</h2>
        <p className="text-xs text-mirai-text-secondary">
          通告一覧の項目に「{ref}
          」が出てくる質問です（文言は通告のまま）。答弁は、中継の録画と会議録でご確認ください。
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {questions.map((question) => (
          <li key={question.id} className="rounded-2xl bg-white px-5 py-3">
            <p className="text-xs text-mirai-text-secondary">
              {question.meeting_name}・
              {COUNCIL_QUESTION_KIND_LABELS[question.kind]}・順位
              {question.order_no}
            </p>
            <p className="mt-1">
              <Link
                href={
                  routes.councilQuestionDetail(
                    question.meeting_key,
                    question.id
                  ) as Route
                }
                className="font-bold hover:underline"
              >
                {question.member_name}
              </Link>
              {question.faction_label && (
                <span className="text-sm text-mirai-text-secondary">
                  （{question.faction_label}）
                </span>
              )}
              {isOperatorQuestion(question, operator.name_in_council) && (
                <span className="ml-2 rounded-full border border-primary px-2 py-0.5 text-xs text-primary">
                  運営者
                </span>
              )}
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {itemsMentioning(question.items, ref).map((item) => (
                <li key={item.label} className="leading-6">
                  <span className="mr-2 font-bold">{item.label}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
