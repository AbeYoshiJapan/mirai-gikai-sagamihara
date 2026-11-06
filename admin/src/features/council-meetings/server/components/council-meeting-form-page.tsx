import { notFound } from "next/navigation";
import { CouncilMeetingForm } from "../../client/components/council-meeting-form";
import { loadCouncilMeetingForm } from "../loaders/load-council-meetings";

/** 会議予定の新規登録（id が null）・編集 */
export async function CouncilMeetingFormPage({ id }: { id: string | null }) {
  const { meeting, committees } = await loadCouncilMeetingForm(id);
  if (id && !meeting) notFound();

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {meeting ? "会議予定を編集" : "会議予定を登録"}
      </h1>
      <section className="rounded-lg border bg-white p-6">
        <CouncilMeetingForm meeting={meeting} committees={committees} />
      </section>
    </div>
  );
}
