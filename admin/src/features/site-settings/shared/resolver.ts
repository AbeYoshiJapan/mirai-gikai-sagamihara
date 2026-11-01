import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import {
  SECTION_SCHEMAS,
  type SiteSettingsSection,
  siteSettingsSchema,
} from "@mirai-gikai/shared/site-settings/schema";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodError } from "zod";

/**
 * zod の issue を react-hook-form の errors 形（パスで入れ子）に変換する。
 * 配列の添字は数値キーのオブジェクトとして入れる（RHF の get() で辿れる）。
 */
export function zodIssuesToFieldErrors(error: ZodError): FieldErrors {
  const errors: Record<string, unknown> = {};
  for (const issue of error.issues) {
    if (issue.path.length === 0) continue;
    let cursor = errors;
    for (let i = 0; i < issue.path.length; i++) {
      const key = String(issue.path[i]);
      if (i === issue.path.length - 1) {
        if (!(key in cursor)) {
          cursor[key] = { type: issue.code, message: issue.message };
        }
      } else {
        if (
          typeof cursor[key] !== "object" ||
          cursor[key] === null ||
          "message" in (cursor[key] as object)
        ) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
    }
  }
  return errors as FieldErrors;
}

/**
 * 1 セクション分のフォーム用 resolver。保存時のサーバー検証と同じスキーマを使う。
 */
export function createSectionResolver(
  section: SiteSettingsSection
): Resolver<FieldValues> {
  return async (values) => {
    const result = SECTION_SCHEMAS[section].safeParse({
      ...DEFAULT_SITE_SETTINGS[section],
      ...values,
    });
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    return { values: {}, errors: zodIssuesToFieldErrors(result.error) };
  };
}

/**
 * 全セクションをまとめて扱うフォーム用 resolver（初期設定ウィザード）。
 */
export function createSiteSettingsResolver(): Resolver<FieldValues> {
  return async (values) => {
    const result = siteSettingsSchema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    return { values: {}, errors: zodIssuesToFieldErrors(result.error) };
  };
}
