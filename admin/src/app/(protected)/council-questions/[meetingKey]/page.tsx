import { CouncilQuestionMeetingPage } from "@/features/council-questions/server/components/council-question-meeting-page";

export default async function CouncilQuestionMeetingRoute({
  params,
}: {
  params: Promise<{ meetingKey: string }>;
}) {
  const { meetingKey } = await params;
  return <CouncilQuestionMeetingPage meetingKey={meetingKey} />;
}
