import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { QuestionTable } from "../../client/components/question-table";
import {
  COUNCIL_QUESTION_KIND_LABELS,
  COUNCIL_QUESTION_KIND_ORDER,
} from "../../shared/types";
import { loadCouncilQuestionMeeting } from "../loaders/load-council-questions";

/** 定例会議ごとの質問。代表質問 → 個人質疑 → 一般質問の順に、公式の順位で並べる */
export async function CouncilQuestionMeetingPage({
  meetingKey,
}: {
  meetingKey: string;
}) {
  const data = await loadCouncilQuestionMeeting(meetingKey);
  if (!data) notFound();

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="space-y-2">
        <Link
          href={routes.councilQuestions() as Route}
          className="inline-flex items-center text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          議会での質問
        </Link>
        <h1 className="text-2xl font-bold">{data.meetingName}</h1>
        <p className="text-sm text-gray-500">
          通告一覧の PDF
          と見比べ、氏名・会派・方式・質問日・項目が合っていれば選んで公開します。
          直すところがあれば、鉛筆のボタンから直してください（直した質問は、次の取込で上書きしません）。
          代表質問と個人質疑は、会派に属さない議員を個人質疑として仮に分けています。違えば直してください。
        </p>
      </div>

      {data.questions.length === 0 ? (
        <p className="text-sm text-gray-500">
          この定例会議の質問はまだありません。
        </p>
      ) : (
        COUNCIL_QUESTION_KIND_ORDER.map((kind) => {
          const questions = data.questions.filter((q) => q.kind === kind);
          if (questions.length === 0) return null;
          return (
            <section key={kind} className="space-y-2">
              <h2 className="text-lg font-semibold">
                {COUNCIL_QUESTION_KIND_LABELS[kind]}（{questions.length} 人）
              </h2>
              <QuestionTable questions={questions} />
            </section>
          );
        })
      )}
    </div>
  );
}
