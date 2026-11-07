import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeetingQuestionsPage } from "@/features/council-questions/server/components/meeting-questions-page";
import { getMeetingQuestions } from "@/features/council-questions/server/loaders/council-question-loaders";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

const MEETING_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ meetingKey: string }>;
}): Promise<Metadata> {
  const { meetingKey } = await params;
  const { site } = await getSiteSettings();
  const questions = MEETING_KEY.test(meetingKey)
    ? await getMeetingQuestions(meetingKey)
    : [];
  const name = questions[0]?.meeting_name ?? "議会での質問";
  return { title: `${name}の質問 | ${site.name}` };
}

export default async function MeetingQuestionsRoute({
  params,
}: {
  params: Promise<{ meetingKey: string }>;
}) {
  await requireFeature("council_questions");
  const { meetingKey } = await params;
  if (!MEETING_KEY.test(meetingKey)) notFound();
  return <MeetingQuestionsPage meetingKey={meetingKey} />;
}
