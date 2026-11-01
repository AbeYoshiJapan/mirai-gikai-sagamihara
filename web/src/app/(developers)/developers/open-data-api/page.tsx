import type { Metadata } from "next";
import { OpenDataApiReference } from "@/features/open-data/client/components/open-data-api-reference";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteSettings();
  return {
    title: `オープンデータAPI | ${site.name}`,
    description: `${site.name}の公開データをオープンデータとして取得できるAPIのリファレンスです。`,
  };
}

export default async function OpenDataApiPage() {
  await requireFeature("open_data_api");
  return <OpenDataApiReference />;
}
