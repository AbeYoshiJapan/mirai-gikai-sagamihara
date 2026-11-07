import type { Metadata } from "next";
import { CouncilQuestionsIndexPage } from "@/features/council-questions/server/components/council-questions-index-page";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  return {
    title: `議会での質問 | ${site.name}`,
    description: `${council.name}の代表質問・個人質疑・一般質問を、通告一覧をもとに定例会議ごとに載せています。`,
  };
}

export default async function CouncilQuestionsRoute() {
  await requireFeature("council_questions");
  return <CouncilQuestionsIndexPage />;
}
