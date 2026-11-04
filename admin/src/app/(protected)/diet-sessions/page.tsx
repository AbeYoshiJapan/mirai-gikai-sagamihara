import { DietSessionForm } from "@/features/diet-sessions/client/components/diet-session-form";
import { DietSessionList } from "@/features/diet-sessions/server/components/diet-session-list";
import { loadDietSessions } from "@/features/diet-sessions/server/loaders/load-diet-sessions";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";

export default async function DietSessionsPage() {
  const [sessions, { settings }] = await Promise.all([
    loadDietSessions(),
    loadSiteSettings(),
  ]);
  const { council } = settings;
  const sessionLabel = council.session_label || "定例会議";

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">会期管理</h1>

      {council.session_model === "year_round" && (
        <p className="mb-6 text-sm text-gray-600">
          {`${council.name}は通年議会です。会期は議会年度ごとに 1 件（例: 4月1日〜翌年3月31日）作り、その中の${sessionLabel}の期間を会期ごとに登録します。公開サイトのトップでは「次の${sessionLabel}の開会まで○日」のように表示されます。`}
        </p>
      )}

      {/* 会期追加セクション */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">会期を追加</h2>
        <DietSessionForm sessionLabel={sessionLabel} />
      </section>

      {/* 会期一覧セクション */}
      <section className="rounded-lg border bg-white p-6">
        <DietSessionList sessions={sessions} sessionLabel={sessionLabel} />
      </section>
    </div>
  );
}
