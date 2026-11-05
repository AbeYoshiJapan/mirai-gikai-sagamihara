import { describe, expect, it } from "vitest";
import {
  BRAND_ASSET_KEYS,
  BRAND_PRESET_LIST,
  BRAND_PRESETS,
  brandColorsMatchPreset,
  brandOgBackgroundPath,
  buildBrandPresetPatch,
  DYNAMIC_OGP_PATH,
  isBrandPresetId,
} from "./brand-presets";
import { UPSTREAM_PRIMARY_COLORS } from "./compliance";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { BRAND_PRESET_IDS, brandSectionSchema } from "./schema";

/** WCAG の相対輝度 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastOnWhite(hex: string): number {
  return (1 + 0.05) / (luminance(hex) + 0.05);
}

describe("BRAND_PRESETS", () => {
  it("すべての案に画像パスがそろい、同じ案のフォルダを指す", () => {
    for (const preset of BRAND_PRESET_LIST) {
      for (const key of BRAND_ASSET_KEYS) {
        const value = preset.assets[key];
        if (key === "service_logo_url") {
          expect(value).toBe("");
        } else if (key === "ogp_image_url") {
          // OGP はサイト名を設定から描く動的な画像（文字を焼き込んだ静的画像を持たない）
          expect(value).toBe(DYNAMIC_OGP_PATH);
          expect(brandOgBackgroundPath(preset.id)).toBe(
            `/brand/${preset.id}/ogp-bg.png`
          );
        } else {
          expect(value.startsWith(`/brand/${preset.id}/`), `${preset.id}.${key}`).toBe(true);
        }
      }
    }
  });

  it("本家の色を使わず、メインカラーに白文字を載せても読める", () => {
    for (const preset of BRAND_PRESET_LIST) {
      const { primary, primary_accent, theme_color } = preset.colors;
      expect(UPSTREAM_PRIMARY_COLORS).not.toContain(primary.toLowerCase());
      expect(contrastOnWhite(primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWhite(primary_accent)).toBeGreaterThanOrEqual(4.5);
      expect(theme_color).toBe(primary);
    }
  });

  it("既定値は案1「かけはし」の色と一致する", () => {
    expect(DEFAULT_SITE_SETTINGS.brand.preset).toBe("kakehashi");
    expect(brandColorsMatchPreset(DEFAULT_SITE_SETTINGS.brand.colors, "kakehashi")).toBe(true);
    expect(brandColorsMatchPreset(DEFAULT_SITE_SETTINGS.brand.colors, "ajisai")).toBe(false);
  });

  it("案を選ぶと色が入り、画像の設定は空に戻る", () => {
    const patch = buildBrandPresetPatch("ajisai");
    expect(patch.preset).toBe("ajisai");
    expect(patch.colors.primary).toBe(BRAND_PRESETS.ajisai.colors.primary);
    for (const key of BRAND_ASSET_KEYS) expect(patch[key]).toBe("");
    // スキーマを通る
    expect(() =>
      brandSectionSchema.parse({ ...DEFAULT_SITE_SETTINGS.brand, ...patch })
    ).not.toThrow();
  });

  it("isBrandPresetId は custom や未知の値を弾く", () => {
    for (const id of BRAND_PRESET_IDS) expect(isBrandPresetId(id)).toBe(true);
    expect(isBrandPresetId("custom")).toBe(false);
    expect(isBrandPresetId("")).toBe(false);
    expect(isBrandPresetId(undefined)).toBe(false);
  });

  it("古い保存値（preset 無し）も既定の案で読める", () => {
    const { preset: _preset, ...legacy } = DEFAULT_SITE_SETTINGS.brand;
    expect(brandSectionSchema.parse(legacy).preset).toBe("kakehashi");
  });
});
