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
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">{council.name}は通年議会です</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              {`会期は議会年度ごとに 1 件だけ作ります（例: 令和8年度 4月1日〜翌年3月31日）。議案はこの会期に紐づきます。`}
            </li>
            <li>
              {`${sessionLabel}（6月・9月・12月・3月など）は会期として「追加」せず、年度の会期の「編集」→「${sessionLabel}などの期間」→「期間を追加」で登録します。`}
            </li>
            <li>
              {`登録すると公開サイトのトップに「次の${sessionLabel}の開会まで○日」が出て、議案一覧も${sessionLabel}ごとにまとまります。`}
            </li>
          </ul>
        </div>
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
