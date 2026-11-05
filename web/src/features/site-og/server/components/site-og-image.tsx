import type { SiteSettings } from "@mirai-gikai/shared/site-settings/schema";
import {
  OG_HEIGHT,
  OG_TEXT_WIDTH,
  OG_WIDTH,
  ogTextColors,
  operatorNote,
  siteNameFontSize,
  truncateForOneLine,
} from "../../shared/utils/site-og-layout";
import type { SiteOgAssets } from "../loaders/load-site-og-assets";

export const OG_FONT_FAMILY = "Noto Sans JP";

type SiteOgImageProps = {
  settings: SiteSettings;
  assets: SiteOgAssets;
};

/**
 * サイトの OGP 画像（1200×630）。Satori（next/og）で描くので、要素はすべて display:flex。
 *
 * 配置は tools/brand/generate.py の ogp_svg と同じ：左上にロゴ、その下にサイト名・
 * キャッチコピー・説明、左下に運営者の注記。背景は文字なしの ogp-bg.png（モチーフ入り）。
 */
export function SiteOgImage({ settings, assets }: SiteOgImageProps) {
  const { site, brand, operator } = settings;
  const colors = ogTextColors(brand);
  const nameSize = siteNameFontSize(site.name);
  const description = truncateForOneLine(site.description, 24);
  const tagline = truncateForOneLine(site.tagline, 30);

  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        position: "relative",
        fontFamily: OG_FONT_FAMILY,
        backgroundColor: brand.colors.gradient_end,
      }}
    >
      {assets.backgroundDataUrl ? (
        // biome-ignore lint/performance/noImgElement: Satori（next/og）は <img> しか描けない
        <img
          src={assets.backgroundDataUrl}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          alt=""
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      ) : (
        // custom 案で背景画像が無いときは、テーマ色の帯だけ引く
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: OG_WIDTH,
            height: 14,
            backgroundColor: brand.colors.primary,
            display: "flex",
          }}
        />
      )}

      {assets.logoDataUrl && (
        // biome-ignore lint/performance/noImgElement: Satori（next/og）は <img> しか描けない
        <img
          src={assets.logoDataUrl}
          width={150}
          height={135}
          alt=""
          style={{ position: "absolute", left: 84, top: 92 }}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 262,
          width: OG_TEXT_WIDTH,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: nameSize,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "0.02em",
            color: colors.ink,
            display: "flex",
          }}
        >
          {site.name}
        </div>
        {tagline && (
          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.3,
              color: colors.sub,
              display: "flex",
            }}
          >
            {tagline}
          </div>
        )}
        {description && (
          <div
            style={{
              marginTop: 18,
              fontSize: 24,
              lineHeight: 1.4,
              color: colors.muted,
              display: "flex",
            }}
          >
            {description}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 86,
          top: 540,
          fontSize: 22,
          lineHeight: 1.3,
          color: colors.muted,
          display: "flex",
        }}
      >
        {operatorNote(operator.title)}
      </div>
    </div>
  );
}
