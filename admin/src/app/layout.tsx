// フォントは同梱の geist パッケージ（next/font/local）。next/font/google は
// ビルドのたびに Google Fonts を取りに行き、CI・Vercel で失敗することがあったため使わない。
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";

export const metadata: Metadata = {
  // サイト名はサイト設定から出す（ログイン画面と (protected) のレイアウトで上書きする）
  title: "管理画面",
  description: "管理者向け画面",
  icons: {
    icon: isDev
      ? "/icons/pwa/icon_dev_192_v3.png"
      : isStaging
        ? "/icons/pwa/icon_staging_192.png"
        : "/icons/pwa/icon_android_192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <NextTopLoader
          color="#3b82f6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
