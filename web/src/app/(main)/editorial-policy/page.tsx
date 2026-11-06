import { renderEditorialPolicy } from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import { LegalMarkdownPage } from "@/components/layouts/legal-markdown-page";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `掲載方針 | ${site.name}`,
    description: `${site.name}に載せる情報の集め方と、AI の使い方。載せているものは、すべて運営者が確認したものです。`,
  };
}

/**
 * 掲載方針。AI の下書きや自動で集めた情報は「仮の取得」にとどめ、
 * 運営者が確認したものだけを載せる、という約束を利用する方に示すページ。
 * 文言はサイト設定（規約・文言タブ）で変えられ、空なら既定文を出す。
 */
export default async function EditorialPolicyPage() {
  const settings = await getSiteSettings();
  return (
    <LegalMarkdownPage
      title="掲載方針"
      enLabel="Editorial Policy"
      description="載せているものは、すべて運営者が確認したものです。情報の集め方と AI の使い方を説明します。"
      markdown={renderEditorialPolicy(settings)}
    />
  );
}
