import { renderLegalText } from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import { LegalMarkdownPage } from "@/components/layouts/legal-markdown-page";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `データ利用規約 | ${site.name}`,
    description: `${site.name}が公開するデータの利用条件`,
  };
}

export default async function DataTermsPage() {
  const settings = await getSiteSettings();
  return (
    <LegalMarkdownPage
      title="データ利用規約"
      enLabel="Data Terms"
      description={`${settings.site.name}が公開するデータを利用するときの条件です。`}
      markdown={renderLegalText(settings, "data_terms_md")}
    />
  );
}
