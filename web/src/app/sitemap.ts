import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { routes } from "@/lib/routes";
import { getSiteSettings, getSiteUrl } from "@/lib/site-settings/loader";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // デプロイごとの仮URL（VERCEL_URL）ではなく本番URL（サイト設定）を載せる
  const [settings, baseUrl] = await Promise.all([
    getSiteSettings(),
    getSiteUrl(),
  ]);
  if (!settings.site.published || !settings.seo.sitemap) {
    return [];
  }

  const bills = await getBills();

  const billUrls = bills.map((bill) => ({
    url: `${baseUrl}${routes.billDetail(bill.id)}`,
    lastModified: new Date(bill.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}${routes.billsList()}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    ...billUrls,
  ];
}
