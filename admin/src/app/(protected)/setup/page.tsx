import Link from "next/link";
import { SetupWizard } from "@/features/site-settings/client/components/setup-wizard";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { routes } from "@/lib/routes";

export default async function SetupPage() {
  const { settings } = await loadSiteSettings();

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">初期設定ウィザード</h1>
        <p className="mt-1 text-sm text-gray-500">
          公開サイトの名前・議会・運営者・見た目・機能を順番に設定します。
          {settings.site.setup_completed && (
            <>
              {" "}
              初期設定はすでに完了しています。個別の項目は
              <Link
                href={routes.settings()}
                className="text-blue-700 underline"
              >
                サイト設定
              </Link>
              からも変更できます。
            </>
          )}
        </p>
      </div>
      <SetupWizard
        current={settings}
        isSetupCompleted={settings.site.setup_completed}
      />
    </div>
  );
}
