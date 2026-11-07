import type { Metadata } from "next";
import { ThemesPage } from "@/features/council-questions/server/components/themes-page";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `テーマ | ${site.name}`,
    description:
      "関心のあるテーマごとに、議案と議会での質問をまとめて見られます。",
  };
}

export default async function ThemesRoute() {
  await requireFeature("council_questions");
  return <ThemesPage />;
}
