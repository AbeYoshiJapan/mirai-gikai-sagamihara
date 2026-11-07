import { CouncilQuestionEditPage } from "@/features/council-questions/server/components/council-question-edit-page";

export default async function CouncilQuestionEditRoute({
  params,
}: {
  params: Promise<{ meetingKey: string; questionId: string }>;
}) {
  const { meetingKey, questionId } = await params;
  return (
    <CouncilQuestionEditPage meetingKey={meetingKey} questionId={questionId} />
  );
}
