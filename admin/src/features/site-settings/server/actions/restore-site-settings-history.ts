"use server";

import { parseSection } from "@mirai-gikai/shared/site-settings/resolve";
import {
  SITE_SETTINGS_SECTIONS,
  type SiteSettingsSection,
} from "@mirai-gikai/shared/site-settings/schema";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { scheduleShareImageRefresh } from "@/features/bills-edit/server/services/share-image-refresh";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  findSiteSettingHistoryById,
  upsertSiteSettingSection,
} from "../repositories/site-settings-repository";

/**
 * 変更履歴の 1 件を現在の設定として戻す。戻す前の値も履歴に残る。
 */
export async function restoreSiteSettingsHistory(
  historyId: number
): Promise<{ error?: string }> {
  try {
    const admin = await requireAdmin();

    const entry = await findSiteSettingHistoryById(historyId);
    if (!entry) {
      return { error: "指定された履歴が見つかりません" };
    }
    if (!SITE_SETTINGS_SECTIONS.includes(entry.key as SiteSettingsSection)) {
      return { error: "不明な設定セクションの履歴です" };
    }

    const section = entry.key as SiteSettingsSection;
    const parsed = parseSection(section, entry.value);

    await upsertSiteSettingSection({
      section,
      value: parsed,
      userId: admin.id,
    });

    await invalidateWebCache([WEB_CACHE_TAGS.SITE_SETTINGS]);
    // サイト名が戻ったら、シェア画像もその名前で作り直す（応答の後に行う）
    if (section === "site") scheduleShareImageRefresh();
    return {};
  } catch (error) {
    console.error("Restore site settings error:", error);
    return {
      error: getErrorMessage(error, "設定の差し戻し中にエラーが発生しました"),
    };
  }
}
