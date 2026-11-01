import { DEFAULT_SITE_SETTINGS } from "./defaults";
import {
  SECTION_SCHEMAS,
  SITE_SETTINGS_SECTIONS,
  type SiteSettings,
  type SiteSettingsSection,
} from "./schema";

export type SiteSettingRow = { key: string; value: unknown };

export type ResolveResult = {
  settings: SiteSettings;
  /** 検証に失敗して既定値に戻したセクション */
  invalidSections: SiteSettingsSection[];
  /** DB に保存されていたセクション */
  storedSections: SiteSettingsSection[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * DB の行（セクション名 → JSON）を既定値に重ねて SiteSettings を作る。
 *
 * - 保存されていないセクションは既定値
 * - 保存値は既定値に浅くマージしてから検証する（列が増えても古い保存値が壊れない）
 * - 検証に失敗したセクションは既定値に戻し、invalidSections に記録する
 *
 * 純粋関数。DB・環境変数には触れない。
 */
export function resolveSiteSettings(
  rows: readonly SiteSettingRow[],
  defaults: SiteSettings = DEFAULT_SITE_SETTINGS
): ResolveResult {
  const byKey = new Map<string, unknown>();
  for (const row of rows) {
    byKey.set(row.key, row.value);
  }

  const settings = { ...defaults } as SiteSettings;
  const invalidSections: SiteSettingsSection[] = [];
  const storedSections: SiteSettingsSection[] = [];

  for (const section of SITE_SETTINGS_SECTIONS) {
    if (!byKey.has(section)) continue;
    storedSections.push(section);

    const stored = byKey.get(section);
    const merged = isPlainObject(stored)
      ? { ...defaults[section], ...stored }
      : stored;
    const parsed = SECTION_SCHEMAS[section].safeParse(merged);
    if (parsed.success) {
      // 各セクションのスキーマは SiteSettings[section] と一致する
      (settings as Record<string, unknown>)[section] = parsed.data;
    } else {
      invalidSections.push(section);
    }
  }

  return { settings, invalidSections, storedSections };
}

/**
 * 1 セクション分の入力を検証する（管理画面の保存で使う）。
 * 失敗時は zod のエラーをそのまま投げる。
 */
export function parseSection<S extends SiteSettingsSection>(
  section: S,
  input: unknown
): SiteSettings[S] {
  const merged = isPlainObject(input)
    ? { ...DEFAULT_SITE_SETTINGS[section], ...input }
    : input;
  return SECTION_SCHEMAS[section].parse(merged) as SiteSettings[S];
}
