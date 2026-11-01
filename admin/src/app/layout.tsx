import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";

export const metadata: Metadata = {
  // サイト名はログイン後のヘッダーで DB の設定から表示する（ここは認証前にも出るので固定）
  title: "管理画面 | みらい議会",
  description: "みらい議会（フォーク版）の管理者向け画面",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
