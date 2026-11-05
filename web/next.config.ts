import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: {
    serverSourceMaps: true,
  },
  typedRoutes: true,
  // OGP 画像の生成（Satori）がファイルから読む素材。ビルド時・実行時にネットワークへ出ない
  outputFileTracingIncludes: {
    "/api/og/report": [
      "../packages/shared/src/og/ogp-logo.png",
      "./src/assets/fonts/*.woff",
    ],
    "/api/og/site": [
      "./src/assets/fonts/*.woff",
      "./public/brand/*/ogp-bg.png",
      "./public/brand/*/logo.svg",
    ],
  },
  redirects: async () => [
    {
      // データ利用規約を /developers 配下へ移動した際の旧URL互換
      source: "/interview-data-terms",
      destination: "/developers/interview-data-terms",
      permanent: true,
    },
  ],
  turbopack: {
    root: "../",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      // サイト設定でアップロードしたロゴ・OGP・背景画像
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/site-assets/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/site-assets/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/site-assets/**",
      },
      ...(isDev
        ? [
            {
              protocol: "https" as const,
              hostname: "placehold.co",
            },
          ]
        : []),
    ],
    ...(isDev && {
      dangerouslyAllowSVG: true,
      contentDispositionType: "attachment" as const,
      contentSecurityPolicy:
        "default-src 'self'; script-src 'none'; sandbox;",
    }),
  },
};

export default nextConfig;
