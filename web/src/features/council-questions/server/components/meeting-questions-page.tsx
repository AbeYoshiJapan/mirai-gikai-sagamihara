import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { isOperatorQuestion } from "../../shared/utils/question-views";
import { getMeetingQuestions } from "../loaders/council-question-loaders";
import { MeetingQuestionsBody } from "./meeting-questions-body";
import { QuestionsNote } from "./question-parts";

export async function MeetingQuestionsPage({
  meetingKey,
}: {
  meetingKey: string;
}) {
  const [{ operator }, questions] = await Promise.all([
    getSiteSettings(),
    getMeetingQuestions(meetingKey),
  ]);
  if (questions.length === 0) notFound();
  const meetingName = questions[0].meeting_name;

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議会での質問", href: routes.councilQuestions() },
            { label: meetingName },
          ]}
        />
      </div>
      <h1 className="mb-6 text-3xl font-bold">{meetingName}の質問</h1>
      <div className="mb-8">
        <QuestionsNote
          hasOperator={questions.some((q) =>
            isOperatorQuestion(q, operator.name_in_council)
          )}
        />
      </div>
      <MeetingQuestionsBody
        questions={questions}
        nameInCouncil={operator.name_in_council}
      />
    </Container>
  );
}
