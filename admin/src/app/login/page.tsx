import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/client/components/login-form";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { env } from "@/lib/env";

/** サイト名はサイト設定から出す（ビルド時に既定の名前で固まらないよう、毎回読む） */
async function loadSiteName(): Promise<string> {
  await connection();
  const { settings } = await loadSiteSettings();
  return settings.site.name;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: `ログイン | ${await loadSiteName()}` };
}

export default async function LoginPage() {
  const siteName = await loadSiteName();
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            管理者ログイン
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {siteName} 管理画面
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm showGoogleLogin={env.googleLoginEnabled} />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              オープンソース「みらい議会」（AGPL-3.0）をもとに運営者が独自に運営しています
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
