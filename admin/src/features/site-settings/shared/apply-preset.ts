import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import type { SiteSettings } from "@mirai-gikai/shared/site-settings/schema";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function mergeLeaf(
  current: unknown,
  preset: unknown,
  defaults: unknown
): unknown {
  if (isPlainObject(current) && isPlainObject(preset)) {
    const result: Record<string, unknown> = { ...current };
    for (const key of Object.keys(preset)) {
      result[key] = mergeLeaf(
        current[key],
        preset[key],
        isPlainObject(defaults) ? defaults[key] : undefined
      );
    }
    return result;
  }
  // 配列と値：運営者がまだ触っていない（既定値のまま）ならプリセットを入れる
  return deepEqual(current, defaults) ? preset : current;
}

/**
 * プリセットを現在の設定に重ねる。
 * 運営者がすでに変えた項目（既定値と異なる値）は残し、既定値のままの項目だけプリセットで埋める。
 */
export function applyPreset(
  current: SiteSettings,
  preset: SiteSettings,
  defaults: SiteSettings = DEFAULT_SITE_SETTINGS
): SiteSettings {
  return mergeLeaf(current, preset, defaults) as SiteSettings;
}
