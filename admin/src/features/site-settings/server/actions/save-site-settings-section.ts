"use server";

import {
  SITE_SETTINGS_PRESETS,
  type SiteSettingsPresetId,
} from "@mirai-gikai/shared/site-settings/presets";
import { parseSection } from "@mirai-gikai/shared/site-settings/resolve";
import {
  SITE_SETTINGS_SECTIONS,
  type SiteSettings,
  type SiteSettingsSection,
} from "@mirai-gikai/shared/site-settings/schema";
import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { scheduleShareImageRefresh } from "@/features/bills-edit/server/services/share-image-refresh";
import {
  countCommittees,
  insertCommitteeRecords,
} from "@/features/committees/server/repositories/committee-repository";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { upsertSiteSettingSection } from "../repositories/site-settings-repository";

export type SaveSectionResult<S extends SiteSettingsSection> =
  | { data: SiteSettings[S]; error?: undefined }
  | { data?: undefined; error: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (!(path in fieldErrors)) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * サイト設定の 1 セクションを検証して保存し、web のキャッシュを無効化する。
 */
export async function saveSiteSettingsSection<S extends SiteSettingsSection>(
  section: S,
  input: unknown
): Promise<SaveSectionResult<S>> {
  try {
    const admin = await requireAdmin();

    if (!SITE_SETTINGS_SECTIONS.includes(section)) {
      return { error: "不明な設定セクションです" };
    }

    let parsed: SiteSettings[S];
    try {
      parsed = parseSection(section, input);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          error: "入力内容に誤りがあります",
          fieldErrors: toFieldErrors(error),
        };
      }
      throw error;
    }

    await upsertSiteSettingSection({
      section,
      value: parsed,
      userId: admin.id,
    });

    await invalidateWebCache([WEB_CACHE_TAGS.SITE_SETTINGS]);
    // サイト名が変わったら、シェア画像も新しい名前で作り直す（応答の後に行う）
    if (section === "site") scheduleShareImageRefresh();
    return { data: parsed };
  } catch (error) {
    console.error("Save site settings error:", error);
    return {
      error: getErrorMessage(error, "サイト設定の保存中にエラーが発生しました"),
    };
  }
}

/**
 * 複数セクションをまとめて保存する（初期設定ウィザード用）。
 * 1 セクションでも検証に失敗したら何も保存しない。
 * presetId を渡すと、委員会がまだ 1 件も無いときだけプリセットの委員会を入れる。
 */
export async function saveSiteSettingsSections(
  input: Partial<Record<SiteSettingsSection, unknown>>,
  options: { presetId?: SiteSettingsPresetId | null } = {}
): Promise<{ error?: string; fieldErrors?: Record<string, string> }> {
  try {
    const admin = await requireAdmin();

    const parsedSections: Partial<SiteSettings> = {};
    const fieldErrors: Record<string, string> = {};

    for (const section of SITE_SETTINGS_SECTIONS) {
      if (!(section in input)) continue;
      try {
        (parsedSections as Record<string, unknown>)[section] = parseSection(
          section,
          input[section]
        );
      } catch (error) {
        if (error instanceof ZodError) {
          for (const [path, message] of Object.entries(toFieldErrors(error))) {
            fieldErrors[`${section}.${path}`] = message;
          }
          continue;
        }
        throw error;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { error: "入力内容に誤りがあります", fieldErrors };
    }

    for (const section of SITE_SETTINGS_SECTIONS) {
      if (!(section in parsedSections)) continue;
      await upsertSiteSettingSection({
        section,
        value: parsedSections[section],
        userId: admin.id,
      });
    }

    const preset = options.presetId
      ? SITE_SETTINGS_PRESETS[options.presetId]
      : null;
    if (preset && (await countCommittees()) === 0) {
      await insertCommitteeRecords(
        preset.committees.map((c) => ({ ...c, is_active: true }))
      );
    }

    await invalidateWebCache([
      WEB_CACHE_TAGS.SITE_SETTINGS,
      WEB_CACHE_TAGS.BILLS,
    ]);
    if ("site" in parsedSections) scheduleShareImageRefresh();
    return {};
  } catch (error) {
    console.error("Save site settings error:", error);
    return {
      error: getErrorMessage(error, "サイト設定の保存中にエラーが発生しました"),
    };
  }
}
