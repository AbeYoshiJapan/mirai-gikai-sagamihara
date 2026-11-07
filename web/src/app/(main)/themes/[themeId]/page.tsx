import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemePage } from "@/features/council-questions/server/components/theme-page";
import { getThemePage } from "@/features/council-questions/server/loaders/council-question-loaders";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ themeId: string }>;
}): Promise<Metadata> {
  const { themeId } = await params;
  const { site } = await getSiteSettings();
  const data = UUID.test(themeId) ? await getThemePage(themeId) : null;
  return {
    title: `${data?.theme.label ?? "テーマ"}（テーマ） | ${site.name}`,
    description: data?.theme.description?.slice(0, 120) ?? undefined,
  };
}

export default async function ThemeRoute({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  await requireFeature("council_questions");
  const { themeId } = await params;
  if (!UUID.test(themeId)) notFound();
  return <ThemePage themeId={themeId} />;
}
