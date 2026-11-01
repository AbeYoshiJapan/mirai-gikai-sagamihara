import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: {
    serverSourceMaps: true,
    // サイト設定の画像アップロード（Server Action 経由、最大 5MB）
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  typedRoutes: true,
  outputFileTracingIncludes: {
    "/api/bill-share-image": ["../packages/shared/src/og/ogp-logo.png"],
    "/bills/[id]/edit": ["../packages/shared/src/og/ogp-logo.png"],
  },
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
      ...(isDev
        ? [
            {
              protocol: "https" as const,
              hostname: "placehold.co",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
