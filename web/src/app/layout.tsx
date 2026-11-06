import "./globals.css";
// フォントは同梱（@fontsource）。next/font/google はビルドのたびに Google Fonts を取りに行き、
// CI・Vercel で取得に失敗してビルドが落ちることがあったため使わない。
// CSS 変数（--font-noto-sans-jp など）は globals.css で定義している。
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-serif-jp";
import "@fontsource-variable/lexend-giga";
import {
  brandAsset,
  brandColorsToCss,
} from "@mirai-gikai/shared/site-settings/public";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { getDeliberationTimeline } from "@/features/diet-sessions/server/loaders/get-deliberation-timeline";
import { DeliberationTimelineProvider } from "@/lib/deliberation-timeline/provider";
import {
  getPublicSiteSettings,
  getSiteSettings,
  getSiteUrl,
} from "@/lib/site-settings/loader";
import { SiteSettingsProvider } from "@/lib/site-settings/provider";

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";

/**
 * サイト名・説明・運営者・OGP・アイコンはすべて管理画面の「サイト設定」から。
 * 検索エンジン向けの構造化データは、運営者を自治体の公式と取り違えないよう個人として示す。
 */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, siteUrl] = await Promise.all([
    getSiteSettings(),
    getSiteUrl(),
  ]);
  const { site, operator, brand, council, seo } = settings;
  const ogImage = {
    url: brandAsset(brand, "ogp_image_url"),
    width: 1200,
    height: 630,
    alt: `${site.name}のOGPイメージ`,
  };
  const indexable = site.published && seo.index;
  const devIcon = isDev
    ? "/icons/pwa/icon_dev_192_v3.png"
    : isStaging
      ? "/icons/pwa/icon_staging_192.png"
      : null;

  return {
    metadataBase: new URL(siteUrl),
    title: site.name,
    description: site.description,
    keywords: [site.name, council.name, council.municipality, "議案", "解説"],
    ...(seo.gsc_verification
      ? { verification: { google: seo.gsc_verification } }
      : {}),
    authors: operator.official_site
      ? [{ name: operator.name, url: operator.official_site }]
      : [{ name: operator.name }],
    creator: operator.name,
    icons: {
      icon: devIcon ?? brandAsset(brand, "icon_192_url"),
      apple: isStaging
        ? "/icons/pwa/icon_staging_ios.png"
        : brandAsset(brand, "icon_ios_url"),
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: site.name,
      description: site.description,
      images: [ogImage],
      siteName: site.name,
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description: site.description,
      images: [ogImage.url],
    },
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: settings.brand.colors.theme_color,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [settings, publicSettings, siteUrl, timeline] = await Promise.all([
    getSiteSettings(),
    getPublicSiteSettings(),
    getSiteUrl(),
    getDeliberationTimeline(),
  ]);
  const { site, operator, brand, council } = settings;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: siteUrl,
    description: site.description,
    inLanguage: "ja",
    publisher: {
      "@type": "Person",
      name: operator.name,
      jobTitle: operator.title || council.name,
      ...(operator.official_site ? { url: operator.official_site } : {}),
      sameAs: [
        operator.official_site,
        ...operator.sns.map((sns) => sns.url),
      ].filter((url) => url.length > 0),
    },
  };

  return (
    <html lang="ja">
      <head>
        {/* テーマ色は設定から。globals.css のトークン名はそのまま */}
        <style>{`:root { ${brandColorsToCss(brand.colors)} }`}</style>
      </head>
      <body className="font-sans antialiased bg-mirai-surface-light">
        <NextTopLoader showSpinner={false} color={brand.colors.primary} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteSettingsProvider value={publicSettings}>
          <DeliberationTimelineProvider value={timeline}>
            {children}
          </DeliberationTimelineProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
