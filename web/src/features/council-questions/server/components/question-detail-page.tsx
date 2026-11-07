import { COUNCIL_QUESTION_KIND_LABELS } from "@mirai-gikai/shared/council-questions/types";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import {
  formatQuestionDate,
  isOperatorQuestion,
} from "../../shared/utils/question-views";
import { getQuestionDetail } from "../loaders/council-question-loaders";
import { QuestionItemTree, QuestionsNote } from "./question-parts";

export async function QuestionDetailPage({
  meetingKey,
  questionId,
}: {
  meetingKey: string;
  questionId: string;
}) {
  const [{ operator }, detail] = await Promise.all([
    getSiteSettings(),
    getQuestionDetail(questionId),
  ]);
  if (!detail || detail.question.meeting_key !== meetingKey) notFound();
  const { question, themesByItem, linkedBills } = detail;
  const isOperator = isOperatorQuestion(question, operator.name_in_council);
  const kindLabel = COUNCIL_QUESTION_KIND_LABELS[question.kind];
  const themedItems = question.items.filter(
    (item) => (themesByItem[Number.parseInt(item.label, 10)] ?? []).length > 0
  );

  const links = [
    question.stream_url && { label: "中継の録画", href: question.stream_url },
    question.minutes_url && { label: "会議録", href: question.minutes_url },
    question.source_url && {
      label: "通告一覧（PDF）",
      href: question.source_url,
    },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議会での質問", href: routes.councilQuestions() },
            {
              label: question.meeting_name,
              href: routes.councilQuestionMeeting(question.meeting_key),
            },
            { label: question.member_name },
          ]}
        />
      </div>

      <p className="mb-1 text-sm text-mirai-text-secondary">
        {question.meeting_name}・{kindLabel}・順位{question.order_no}
      </p>
      <h1 className="mb-2 flex flex-wrap items-baseline gap-x-3 text-3xl font-bold">
        {question.member_name}
        {question.faction_label && (
          <span className="text-base font-normal text-mirai-text-secondary">
            （{question.faction_label}）
          </span>
        )}
        {isOperator && (
          <span className="rounded-full border border-primary px-2 py-0.5 text-xs font-normal text-primary">
            運営者
          </span>
        )}
      </h1>
      <p className="mb-6 text-sm text-mirai-text-secondary">
        {[
          question.method && `質問方式：${question.method}`,
          question.question_date &&
            `質問日：${formatQuestionDate(question.question_date)}`,
        ]
          .filter(Boolean)
          .join("　")}
      </p>

      <section className="mb-8 rounded-2xl bg-white px-5 py-5 text-[15px]">
        <h2 className="mb-3 text-lg font-bold">通告の内容</h2>
        <QuestionItemTree items={question.items} />
      </section>

      {links.length > 0 && (
        <section className="mb-8 flex flex-wrap gap-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-white px-4 py-2 text-sm font-bold text-primary"
            >
              {link.label}
              <ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </section>
      )}

      {linkedBills.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">取り上げた議案</h2>
          <ul className="flex flex-col gap-2">
            {linkedBills.map((bill) => (
              <li key={bill.id}>
                <Link
                  href={routes.billDetail(bill.id)}
                  className="font-bold text-primary underline underline-offset-2"
                >
                  {bill.bill_number}
                </Link>{" "}
                <span className="text-sm">{bill.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {themedItems.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">テーマ</h2>
          <ul className="flex flex-col gap-3">
            {themedItems.map((item) => (
              <li key={item.label} className="text-sm">
                <div className="mb-1">
                  {item.label} {item.text}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(themesByItem[Number.parseInt(item.label, 10)] ?? []).map(
                    (theme) => (
                      <Link
                        key={theme.id}
                        href={routes.themeDetail(theme.id) as Route}
                        className="rounded-full bg-mirai-surface-tag px-3 py-1 text-xs font-bold"
                      >
                        {theme.label}
                      </Link>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mb-8">
        <Link
          href={routes.councilQuestionMember(question.member_name) as Route}
          className="text-sm font-bold text-primary underline underline-offset-2"
        >
          {question.member_name}議員のほかの質問
        </Link>
      </p>

      <QuestionsNote hasOperator={isOperator} />
    </Container>
  );
}
