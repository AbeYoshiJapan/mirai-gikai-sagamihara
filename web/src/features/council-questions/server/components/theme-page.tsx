import { COUNCIL_QUESTION_KIND_LABELS } from "@mirai-gikai/shared/council-questions/types";
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
import { getThemePage } from "../loaders/council-question-loaders";

/** テーマのページ：説明、議案、議会での質問（ひも付けた項目） */
export async function ThemePage({ themeId }: { themeId: string }) {
  const [{ operator }, data] = await Promise.all([
    getSiteSettings(),
    getThemePage(themeId),
  ]);
  if (!data) notFound();
  const { theme, bills, items } = data;

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "テーマ", href: routes.themes() },
            { label: theme.label },
          ]}
        />
      </div>
      <h1 className="mb-3 text-3xl font-bold">{theme.label}</h1>
      {theme.description && (
        <p className="mb-8 whitespace-pre-line text-[15px] leading-7">
          {theme.description}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-bold">議案</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-mirai-text-secondary">まだありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bills.map((bill) => (
              <li key={bill.id} className="rounded-2xl bg-white px-5 py-3">
                <Link
                  href={routes.billDetail(bill.id)}
                  className="font-bold hover:underline"
                >
                  {bill.title ?? bill.name}
                </Link>
                {bill.bill_number && (
                  <span className="ml-2 text-xs text-mirai-text-secondary">
                    {bill.bill_number}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">議会での質問</h2>
        {items.length === 0 ? (
          <p className="text-sm text-mirai-text-secondary">まだありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(({ question, itemNumber }) => {
              const item = question.items.find(
                (i) => Number.parseInt(i.label, 10) === itemNumber
              );
              return (
                <li
                  key={`${question.id}-${itemNumber}`}
                  className="rounded-2xl bg-white px-5 py-3"
                >
                  <p className="text-xs text-mirai-text-secondary">
                    {question.meeting_name}・
                    {COUNCIL_QUESTION_KIND_LABELS[question.kind]}
                    {question.question_date &&
                      `・${formatQuestionDate(question.question_date)}`}
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
                  {item && (
                    <p className="mt-1 text-[15px]">
                      <span className="mr-2 font-bold">{item.label}</span>
                      {item.text}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
