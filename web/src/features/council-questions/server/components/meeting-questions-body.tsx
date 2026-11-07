import { COUNCIL_QUESTION_KIND_LABELS } from "@mirai-gikai/shared/council-questions/types";
import type { PublicCouncilQuestion } from "../../shared/types";
import {
  formatQuestionDate,
  groupQuestionsByDate,
  groupQuestionsByKind,
  isOperatorQuestion,
} from "../../shared/utils/question-views";
import { QuestionSummaryCard } from "./question-parts";

/** 定例会議の質問を、区分ごと（一般質問は質問日ごと）に公式の順番で並べる */
export function MeetingQuestionsBody({
  questions,
  nameInCouncil,
}: {
  questions: PublicCouncilQuestion[];
  nameInCouncil: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      {groupQuestionsByKind(questions).map((group) => (
        <section key={group.kind} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">
            {COUNCIL_QUESTION_KIND_LABELS[group.kind]}（{group.questions.length}
            人）
          </h2>
          {group.kind === "general"
            ? groupQuestionsByDate(group.questions).map((day) => (
                <div
                  key={day.date ?? "undecided"}
                  className="flex flex-col gap-3"
                >
                  <h3 className="text-[15px] font-bold text-mirai-brand-teal-deep">
                    {day.date ? formatQuestionDate(day.date) : "質問日は未定"}
                  </h3>
                  {day.questions.map((question) => (
                    <QuestionSummaryCard
                      key={question.id}
                      question={question}
                      isOperator={isOperatorQuestion(question, nameInCouncil)}
                    />
                  ))}
                </div>
              ))
            : group.questions.map((question) => (
                <QuestionSummaryCard
                  key={question.id}
                  question={question}
                  isOperator={isOperatorQuestion(question, nameInCouncil)}
                />
              ))}
        </section>
      ))}
    </div>
  );
}
