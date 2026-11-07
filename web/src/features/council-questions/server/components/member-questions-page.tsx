import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { isOperatorQuestion } from "../../shared/utils/question-views";
import { getMemberQuestions } from "../loaders/council-question-loaders";
import { QuestionSummaryCard, QuestionsNote } from "./question-parts";

/** 議員ごとの質問の履歴（新しい定例会議が先） */
export async function MemberQuestionsPage({
  memberName,
}: {
  memberName: string;
}) {
  const [{ operator }, questions] = await Promise.all([
    getSiteSettings(),
    getMemberQuestions(memberName),
  ]);
  if (questions.length === 0) notFound();
  const isOperator = isOperatorQuestion(questions[0], operator.name_in_council);

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議会での質問", href: routes.councilQuestions() },
            { label: `${memberName}議員` },
          ]}
        />
      </div>
      <h1 className="mb-6 text-3xl font-bold">
        {memberName}議員の議会での質問
      </h1>
      <div className="mb-8">
        <QuestionsNote hasOperator={isOperator} />
      </div>
      <div className="flex flex-col gap-4">
        {questions.map((question) => (
          <QuestionSummaryCard
            key={question.id}
            question={question}
            isOperator={isOperator}
            showMeeting
          />
        ))}
      </div>
    </Container>
  );
}
