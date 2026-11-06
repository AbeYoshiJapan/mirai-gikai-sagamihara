import { hasSessionSystemPage } from "@mirai-gikai/shared/site-settings/public";
import type { MetadataRoute } from "next";
import { getBills } from "@/features/bills/server/loaders/get-bills";
import { routes } from "@/lib/routes";
import { getSiteSettings, getSiteUrl } from "@/lib/site-settings/loader";

// 議案の増減とサイト設定を 10 分ごとに反映する（ビルド時だけの生成にしない）
export const revalidate = 600;

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

  const staticUrls: MetadataRoute.Sitemap = [
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
  ];
  if (settings.features.schedule) {
    staticUrls.push({
      url: `${baseUrl}${routes.schedule()}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    });
  }
  // 掲載方針（運営者が確認したものだけを載せる・AI と自動収集の扱い）
  staticUrls.push({
    url: `${baseUrl}${routes.editorialPolicy()}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  });
  // 会期の制度（通年議会など）の説明ページ。制度名が空なら無い
  if (hasSessionSystemPage(settings.council)) {
    staticUrls.push({
      url: `${baseUrl}${routes.councilSystem()}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    });
  }

  return [...staticUrls, ...billUrls];
}
