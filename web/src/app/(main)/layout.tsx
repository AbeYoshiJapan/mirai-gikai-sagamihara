import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ComingSoonPage } from "@/components/layouts/coming-soon-page";
import { SiteChrome } from "@/components/layouts/site-chrome";
import { env } from "@/lib/env";
import {
  isSitePreviewCookieValid,
  SITE_PREVIEW_COOKIE_NAME,
} from "@/lib/site-preview";
import { getSiteSettings } from "@/lib/site-settings/loader";

export default async function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { site } = await getSiteSettings();

  if (!site.published) {
    const cookieStore = await cookies();
    const previewCookie = cookieStore.get(SITE_PREVIEW_COOKIE_NAME)?.value;
    if (!isSitePreviewCookieValid(previewCookie, env.sitePreviewSecret)) {
      return <ComingSoonPage />;
    }
  }

  return <SiteChrome>{children}</SiteChrome>;
}
