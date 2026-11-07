import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateWithWeekday } from "@/features/council-meetings/shared/utils/meeting-views";
import { routes } from "@/lib/routes";
import { QuestionEditForm } from "../../client/components/question-edit-form";
import { QuestionPendingBanner } from "../../client/components/question-pending-banner";
import { COUNCIL_QUESTION_KIND_LABELS } from "../../shared/types";
import { loadCouncilQuestionEdit } from "../loaders/load-council-questions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/** 質問 1 件の確認・編集 */
export async function CouncilQuestionEditPage({
  meetingKey,
  questionId,
}: {
  meetingKey: string;
  questionId: string;
}) {
  const data = await loadCouncilQuestionEdit(questionId);
  if (!data || data.question.meeting_key !== meetingKey) notFound();
  const { question } = data;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <Link
          href={routes.councilQuestionMeeting(meetingKey) as Route}
          className="inline-flex items-center text-sm text-gray-600 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {question.meeting_name}
        </Link>
        <h1 className="text-2xl font-bold">
          {COUNCIL_QUESTION_KIND_LABELS[question.kind]} 順位{question.order_no}
          ：{question.member_name}
        </h1>
        <p className="text-sm text-gray-500">
          {question.is_published
            ? `公開中（${question.confirmed_at ? formatDateTime(question.confirmed_at) : ""} に確認）`
            : "仮登録（公開されていません）"}
          {question.notice_date &&
            `・通告一覧の日付 ${formatDateWithWeekday(question.notice_date)}`}
          {question.fetched_at &&
            `・最後の取込 ${formatDateTime(question.fetched_at)}`}
        </p>
      </div>

      <QuestionPendingBanner question={question} />

      <QuestionEditForm
        question={question}
        themeOptions={data.themeOptions}
        themeLinks={data.themeLinks}
      />
    </div>
  );
}
