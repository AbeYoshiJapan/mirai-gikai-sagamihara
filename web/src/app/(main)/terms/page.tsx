import { renderLegalText } from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import { LegalMarkdownPage } from "@/components/layouts/legal-markdown-page";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `利用規約 | ${site.name}`,
    description: `${site.name}の利用規約`,
  };
}

export default async function TermsPage() {
  const settings = await getSiteSettings();
  return (
    <LegalMarkdownPage
      title="利用規約"
      enLabel="Terms of Service"
      description={`${settings.site.name}をご利用いただくにあたっての基本的なルールを定めています。`}
      markdown={renderLegalText(settings, "terms_md")}
    />
  );
}
