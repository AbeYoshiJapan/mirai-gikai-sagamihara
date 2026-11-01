"use client";

import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import {
  type PublicSiteSettings,
  toPublicSiteSettings,
} from "@mirai-gikai/shared/site-settings/public";
import { createContext, type ReactNode, useContext } from "react";

const SiteSettingsContext = createContext<PublicSiteSettings | null>(null);

const FALLBACK = toPublicSiteSettings(DEFAULT_SITE_SETTINGS);

/**
 * RootLayout で公開サイト向けの設定をクライアントに渡す。
 */
export function SiteSettingsProvider({
  value,
  children,
}: {
  value: PublicSiteSettings;
  children: ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/**
 * クライアントコンポーネントから設定を読む。
 * Provider の外（単体テストなど）では既定値を返す。
 */
export function useSiteSettings(): PublicSiteSettings {
  return useContext(SiteSettingsContext) ?? FALLBACK;
}
