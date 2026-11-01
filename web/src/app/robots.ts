import type { MetadataRoute } from "next";
import { getSiteSettings, getSiteUrl } from "@/lib/site-settings/loader";

// サイト設定（公開状態・noindex）を反映するため、ビルド時に固定しない
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [settings, siteUrl] = await Promise.all([
    getSiteSettings(),
    getSiteUrl(),
  ]);
  const indexable = settings.site.published && settings.seo.index;

  if (!indexable) {
    // 公開前・インデックス無効の間はすべて拒否
    return { rules: { userAgent: "*", disallow: "/" }, host: siteUrl };
  }

  return {
    rules: {
      userAgent: "*",
      // レポートのシェア画像（/api/og/）は X などのカード取得のため許可する
      allow: ["/", "/api/og/"],
      // 公開前の確認用ページと開発用ページは検索に出さない
      disallow: ["/preview/", "/dev/", "/api/", ...settings.seo.noindex_paths],
    },
    sitemap: settings.seo.sitemap ? `${siteUrl}/sitemap.xml` : undefined,
    host: siteUrl,
  };
}
