import "server-only";

import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { resolveSiteSettings } from "@mirai-gikai/shared/site-settings/resolve";
import type {
  SiteSettings,
  SiteSettingsSection,
} from "@mirai-gikai/shared/site-settings/schema";
import {
  findAllSiteSettingRows,
  findSiteSettingHistory,
  type SiteSettingHistoryRow,
} from "../repositories/site-settings-repository";

export type LoadedSiteSettings = {
  settings: SiteSettings;
  storedSections: SiteSettingsSection[];
  invalidSections: SiteSettingsSection[];
  /** セクションごとの最終更新日時（ISO 文字列） */
  updatedAt: Partial<Record<SiteSettingsSection, string>>;
};

/**
 * 管理画面用。キャッシュせず常に DB の最新を読む。
 * テーブル未作成などで読めない場合は既定値を返す（画面は出す）。
 */
export async function loadSiteSettings(): Promise<LoadedSiteSettings> {
  try {
    const rows = await findAllSiteSettingRows();
    const { settings, storedSections, invalidSections } =
      resolveSiteSettings(rows);
    const updatedAt: Partial<Record<SiteSettingsSection, string>> = {};
    for (const row of rows) {
      if (storedSections.includes(row.key as SiteSettingsSection)) {
        updatedAt[row.key as SiteSettingsSection] = row.updated_at;
      }
    }
    return { settings, storedSections, invalidSections, updatedAt };
  } catch (error) {
    console.error("[site-settings] falling back to defaults:", error);
    return {
      settings: DEFAULT_SITE_SETTINGS,
      storedSections: [],
      invalidSections: [],
      updatedAt: {},
    };
  }
}

export async function loadSiteSettingHistory(
  section: SiteSettingsSection
): Promise<SiteSettingHistoryRow[]> {
  try {
    return await findSiteSettingHistory({ section, limit: 20 });
  } catch (error) {
    console.error("[site-settings] history unavailable:", error);
    return [];
  }
}
