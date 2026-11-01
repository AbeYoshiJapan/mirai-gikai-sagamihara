import { renderLegalText } from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import { LegalMarkdownPage } from "@/components/layouts/legal-markdown-page";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `プライバシーポリシー | ${site.name}`,
    description: `${site.name}のプライバシーポリシー`,
  };
}

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  return (
    <LegalMarkdownPage
      title="プライバシーポリシー"
      enLabel="Privacy Policy"
      description={`${settings.site.name}が取得する情報と、その取り扱いについて定めています。`}
      markdown={renderLegalText(settings, "privacy_md")}
    />
  );
}
