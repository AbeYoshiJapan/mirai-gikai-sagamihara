import { CouncilMeetingFormPage } from "@/features/council-meetings/server/components/council-meeting-form-page";

export default async function EditCouncilMeetingRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CouncilMeetingFormPage id={id} />;
}
