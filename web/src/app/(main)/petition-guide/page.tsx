import { renderLegalText } from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import { LegalMarkdownPage } from "@/components/layouts/legal-markdown-page";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  return {
    title: `議会に正式に届けるには | ${site.name}`,
    description: `${council.name}への請願・陳情など、正式に要望を届ける方法の案内`,
  };
}

/**
 * このサイトの意見フォームは運営者の参考資料であって正式な意思表示ではない、
 * という区別を示し、議会の請願・陳情の手続きへ案内するページ。
 */
export default async function PetitionGuidePage() {
  const settings = await getSiteSettings();
  const guideUrl = settings.links.petition_guide;
  const markdown = [
    renderLegalText(settings, "petition_guide_md"),
    guideUrl
      ? `\n## ${settings.council.name}の案内ページ\n\n[請願と陳情の手続き（${settings.council.name}）](${guideUrl})\n`
      : "",
    settings.links.public_comment_page
      ? `\n[${settings.council.municipality}のパブリックコメント](${settings.links.public_comment_page})\n`
      : "",
  ].join("\n");

  return (
    <LegalMarkdownPage
      title="議会に正式に届けるには"
      enLabel="How to Petition"
      description="このサイトの意見フォームと、議会への正式な手続き（請願・陳情）の違いを説明します。"
      markdown={markdown}
    />
  );
}
