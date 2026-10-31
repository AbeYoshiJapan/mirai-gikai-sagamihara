import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 公開前の確認用ページと開発用ページは検索に出さない
      disallow: ["/preview/", "/dev/", "/api/"],
    },
    sitemap: `${env.webUrl}/sitemap.xml`,
    host: env.webUrl,
  };
}
