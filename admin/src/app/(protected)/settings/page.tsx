import { SITE_SETTINGS_SECTIONS } from "@mirai-gikai/shared/site-settings/schema";
import { Suspense } from "react";
import { SiteSettingsTabs } from "@/features/site-settings/client/components/site-settings-tabs";
import {
  loadSiteSettingHistory,
  loadSiteSettings,
} from "@/features/site-settings/server/loaders/load-site-settings";
import { buildSitePreviewUrl } from "@/features/site-settings/server/utils/build-site-preview-url";
import { env } from "@/lib/env";

export default async function SiteSettingsPage() {
  const loaded = await loadSiteSettings();

  const historyEntries = await Promise.all(
    SITE_SETTINGS_SECTIONS.map(
      async (section) =>
        [section, await loadSiteSettingHistory(section)] as const
    )
  );
  const history = Object.fromEntries(historyEntries);

  return (
    <div className="container mx-auto py-8">
      <Suspense>
        <SiteSettingsTabs
          settings={loaded.settings}
          storedSections={loaded.storedSections}
          invalidSections={loaded.invalidSections}
          updatedAt={loaded.updatedAt}
          history={history}
          previewUrl={buildSitePreviewUrl(env.webUrl, env.sitePreviewSecret)}
          webUrl={env.webUrl}
        />
      </Suspense>
    </div>
  );
}
