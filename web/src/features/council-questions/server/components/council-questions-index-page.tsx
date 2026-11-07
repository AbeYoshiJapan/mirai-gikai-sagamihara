import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { isOperatorQuestion } from "../../shared/utils/question-views";
import {
  getMeetingQuestions,
  getQuestionMeetings,
} from "../loaders/council-question-loaders";
import { MeetingQuestionsBody } from "./meeting-questions-body";
import { QuestionsNote } from "./question-parts";

/** 議会での質問のトップ。いちばん新しい定例会議の質問と、ほかの定例会議への入口 */
export async function CouncilQuestionsIndexPage() {
  const [{ council, operator }, meetings] = await Promise.all([
    getSiteSettings(),
    getQuestionMeetings(),
  ]);
  const latest = meetings[0];
  const questions = latest ? await getMeetingQuestions(latest.meeting_key) : [];
  const hasOperator = questions.some((q) =>
    isOperatorQuestion(q, operator.name_in_council)
  );

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議会での質問" },
          ]}
        />
      </div>
      <h1 className="mb-3 text-3xl font-bold">議会での質問</h1>
      <p className="mb-6 text-sm leading-6 text-mirai-text-secondary">
        {`${council.name}の本会議での代表質問・個人質疑・一般質問です。定例会議ごとに、だれが何を取り上げるのかを見られます。`}
      </p>
      <div className="mb-8">
        <QuestionsNote hasOperator={hasOperator} />
      </div>

      {meetings.length > 1 && (
        <nav aria-label="定例会議" className="mb-8 flex flex-wrap gap-2">
          {meetings.map((meeting) => (
            <Link
              key={meeting.meeting_key}
              href={routes.councilQuestionMeeting(meeting.meeting_key) as Route}
              className="rounded-full border border-mirai-surface-muted bg-white px-3 py-1 text-sm hover:bg-mirai-surface"
            >
              {meeting.meeting_name}（{meeting.count}）
            </Link>
          ))}
        </nav>
      )}

      {latest ? (
        <>
          <h2 className="mb-4 text-2xl font-bold">{latest.meeting_name}</h2>
          <MeetingQuestionsBody
            questions={questions}
            nameInCouncil={operator.name_in_council}
          />
        </>
      ) : (
        <p className="rounded-2xl bg-white px-5 py-6 text-sm text-mirai-text-secondary">
          まだ載せている質問はありません。定例会議の通告一覧が公表されたら、確認して載せます。
        </p>
      )}
    </Container>
  );
}
