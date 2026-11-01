import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings/loader";

// サイト名・テーマ色はサイト設定から読むため、ビルド時に固定しない
export const dynamic = "force-dynamic";

/** PWA マニフェスト。名前・色・アイコンはサイト設定から */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site, brand } = await getSiteSettings();
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4F0",
    theme_color: brand.colors.theme_color,
    orientation: "portrait-primary",
    icons: [
      {
        src: brandAsset(brand, "icon_192_url"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: brandAsset(brand, "icon_512_url"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
