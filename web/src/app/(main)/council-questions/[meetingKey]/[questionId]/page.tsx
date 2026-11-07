import { COUNCIL_QUESTION_KIND_LABELS } from "@mirai-gikai/shared/council-questions/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionDetailPage } from "@/features/council-questions/server/components/question-detail-page";
import { getQuestionDetail } from "@/features/council-questions/server/loaders/council-question-loaders";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ meetingKey: string; questionId: string }>;
}): Promise<Metadata> {
  const { questionId } = await params;
  const { site } = await getSiteSettings();
  const detail = UUID.test(questionId)
    ? await getQuestionDetail(questionId)
    : null;
  if (!detail) return { title: `議会での質問 | ${site.name}` };
  const { question } = detail;
  return {
    title: `${question.member_name}議員の${COUNCIL_QUESTION_KIND_LABELS[question.kind]}（${question.meeting_name}） | ${site.name}`,
    description: question.items
      .map((item) => item.text)
      .join("／")
      .slice(0, 120),
  };
}

export default async function QuestionDetailRoute({
  params,
}: {
  params: Promise<{ meetingKey: string; questionId: string }>;
}) {
  await requireFeature("council_questions");
  const { meetingKey, questionId } = await params;
  if (!UUID.test(questionId)) notFound();
  return <QuestionDetailPage meetingKey={meetingKey} questionId={questionId} />;
}
