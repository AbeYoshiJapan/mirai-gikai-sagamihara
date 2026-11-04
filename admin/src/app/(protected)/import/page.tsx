import { ImportForm } from "@/features/import/client/components/import-form";
import { ImportRunList } from "@/features/import/server/components/import-run-list";
import { loadImportPage } from "@/features/import/server/loaders/load-import-page";

export default async function ImportPage() {
  const { sessions, runs } = await loadImportPage();

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-2 text-2xl font-bold">取込</h1>
      <p className="mb-6 text-sm text-gray-500">
        取込ツール（tools/import）が議会サイトの PDF から作った JSON
        を読み込み、議案の追加・更新を確認してから適用します。
        追加した議案は下書きで、公開はされません。審議結果の JSON
        なら、段階・結果・議決日を更新します。
      </p>
      <ImportForm sessions={sessions} />
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">取込の履歴</h2>
        <ImportRunList runs={runs} />
      </section>
    </div>
  );
}
