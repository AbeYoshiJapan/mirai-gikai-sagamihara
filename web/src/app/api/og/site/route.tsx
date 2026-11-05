import { buildOgFontOptions } from "@mirai-gikai/shared/og/assets";
import { ImageResponse } from "next/og";
import { SiteOgImage } from "@/features/site-og/server/components/site-og-image";
import { loadSiteOgAssets } from "@/features/site-og/server/loaders/load-site-og-assets";
import {
  OG_HEIGHT,
  OG_WIDTH,
} from "@/features/site-og/shared/utils/site-og-layout";
import { getSiteSettings } from "@/lib/site-settings/loader";

/**
 * サイトの OGP 画像。サイト名・キャッチコピー・説明・運営者の肩書きをサイト設定から読み、
 * ブランド案の文字なし背景（ogp-bg.png）とロゴの上に描く。
 * サイト設定の OGP 画像が空のとき、layout.tsx のメタデータがこの URL を指す。
 */
export async function GET() {
  const settings = await getSiteSettings();
  const assets = await loadSiteOgAssets(settings);

  return new ImageResponse(
    <SiteOgImage settings={settings} assets={assets} />,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      ...buildOgFontOptions(assets.font, 700),
      headers: {
        // 設定を変えたら 1 時間以内に反映。SNS 側のキャッシュは別
        "Cache-Control": "public, max-age=600, s-maxage=3600",
      },
    }
  );
}
