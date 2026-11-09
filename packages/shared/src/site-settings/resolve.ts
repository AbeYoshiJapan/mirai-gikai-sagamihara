import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { enforceLockedFeatures } from "./locked-features";
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

  // この版で使わない機能は、保存値に関係なく無効にする（掲載方針）
  settings.features = enforceLockedFeatures(settings.features);

  return { settings, invalidSections, storedSections };
}

/**
 * 読み込み済みの設定に、あとから増えた項目の既定値を足す。
 *
 * 公開サイトは設定をしばらくキャッシュするため、項目を足した版を出した直後は、
 * 前の版で作ったキャッシュ（新しい項目が無い）が返ることがある。そのまま使うと
 * 新しい項目が undefined になって画面が壊れるので、読むたびにこれを通す。
 * 純粋関数。保存値（あるもの）は変えない。
 */
export function withSettingsDefaults(
  settings: SiteSettings,
  defaults: SiteSettings = DEFAULT_SITE_SETTINGS
): SiteSettings {
  const filled = { ...defaults } as Record<string, unknown>;
  for (const section of SITE_SETTINGS_SECTIONS) {
    const base = defaults[section];
    const value = (settings as Partial<SiteSettings>)[section];
    filled[section] =
      isPlainObject(base) && isPlainObject(value)
        ? { ...base, ...value }
        : (value ?? base);
  }
  return filled as SiteSettings;
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
  const parsed = SECTION_SCHEMAS[section].parse(merged) as SiteSettings[S];
  if (section === "features") {
    // 常に無効にする機能は、true が送られてきても false で保存する
    return enforceLockedFeatures(
      parsed as SiteSettings["features"]
    ) as SiteSettings[S];
  }
  return parsed;
}
