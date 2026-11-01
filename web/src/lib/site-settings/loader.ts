import "server-only";

import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import {
  type PublicSiteSettings,
  toPublicSiteSettings,
} from "@mirai-gikai/shared/site-settings/public";
import { resolveSiteSettings } from "@mirai-gikai/shared/site-settings/resolve";
import type {
  FeatureFlag,
  SiteSettings,
} from "@mirai-gikai/shared/site-settings/schema";
import { createAdminClient } from "@mirai-gikai/supabase";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { env } from "@/lib/env";

/**
 * サイト設定を DB から読む。管理画面で保存すると CACHE_TAGS.SITE_SETTINGS が
 * revalidate されるので、通常は 10 分キャッシュで十分。
 *
 * 取得失敗（テーブル未作成・接続エラー）は例外にしてキャッシュに載せず、
 * 呼び出し側で既定値に落とす。設定が読めなくてもサイトは表示する。
 */
const _getCachedSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value");
    if (error) {
      throw new Error(`Failed to load site settings: ${error.message}`);
    }
    const { settings, invalidSections } = resolveSiteSettings(data ?? []);
    if (invalidSections.length > 0) {
      console.warn(
        `[site-settings] invalid sections fell back to defaults: ${invalidSections.join(", ")}`
      );
    }
    return settings;
  },
  ["site-settings"],
  { revalidate: 600, tags: [CACHE_TAGS.SITE_SETTINGS] }
);

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return await _getCachedSiteSettings();
  } catch (error) {
    console.error("[site-settings] falling back to defaults:", error);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  return toPublicSiteSettings(await getSiteSettings());
}

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const settings = await getSiteSettings();
  return settings.features[flag];
}

/**
 * 機能が無効なら 404 にする。ページと API ルートの先頭で呼ぶ。
 */
export async function requireFeature(flag: FeatureFlag): Promise<void> {
  if (!(await isFeatureEnabled(flag))) {
    notFound();
  }
}

/** 本番 URL。設定が空なら環境変数の値 */
export async function getSiteUrl(): Promise<string> {
  const settings = await getSiteSettings();
  return settings.site.canonical_url || env.webUrl;
}
