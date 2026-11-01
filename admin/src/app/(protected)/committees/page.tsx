import { CommitteeManager } from "@/features/committees/client/components/committee-manager";
import { loadCommittees } from "@/features/committees/server/loaders/load-committees";

export default async function CommitteesPage() {
  const committees = await loadCommittees();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">委員会</h1>
      <p className="text-sm text-gray-500 mb-8">
        議案の付託先として選べる委員会です。改選や廃止で使わなくなった委員会は削除せず「有効」を外してください。
      </p>
      <section className="rounded-lg border bg-white p-6">
        <CommitteeManager committees={committees} />
      </section>
    </div>
  );
}
