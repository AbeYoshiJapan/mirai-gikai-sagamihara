import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ComingSoonPage } from "@/components/layouts/coming-soon-page";
import { env } from "@/lib/env";
import {
  isSitePreviewCookieValid,
  SITE_PREVIEW_COOKIE_NAME,
} from "@/lib/site-preview";
import { getSiteSettings } from "@/lib/site-settings/loader";

/**
 * site.published が false の間は「準備中」ページを出す。
 * 合言葉 Cookie（/api/site-preview で付与）を持つ管理者には通常のページを見せる。
 * 公開ページの layout で使う。/preview 配下はトークン認証なので使わない。
 */
export async function PublishGate({ children }: { children: ReactNode }) {
  const { site } = await getSiteSettings();

  if (!site.published) {
    const cookieStore = await cookies();
    const previewCookie = cookieStore.get(SITE_PREVIEW_COOKIE_NAME)?.value;
    if (!isSitePreviewCookieValid(previewCookie, env.sitePreviewSecret)) {
      return <ComingSoonPage />;
    }
  }

  return <>{children}</>;
}
