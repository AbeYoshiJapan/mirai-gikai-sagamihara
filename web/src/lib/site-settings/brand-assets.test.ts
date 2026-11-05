import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  BRAND_ASSET_KEYS,
  BRAND_PRESET_LIST,
  brandOgBackgroundPath,
  DYNAMIC_OGP_PATH,
} from "@mirai-gikai/shared/site-settings/brand-presets";
import { describe, expect, it } from "vitest";

/**
 * ブランド案の同梱画像が web/public に実際にあることを確かめる。
 * 案を増やしたとき、画像の置き忘れをここで検出する。
 */
describe("ブランド案の同梱画像", () => {
  for (const preset of BRAND_PRESET_LIST) {
    it(`${preset.label}（${preset.id}）の画像がそろっている`, () => {
      for (const key of BRAND_ASSET_KEYS) {
        const asset = preset.assets[key];
        if (!asset || asset === DYNAMIC_OGP_PATH) continue;
        expect(
          existsSync(join(process.cwd(), "public", asset)),
          `${preset.id}.${key}: public${asset}`
        ).toBe(true);
      }
      // OGP の文字なし背景（/api/og/site が使う）
      const bg = brandOgBackgroundPath(preset.id);
      expect(existsSync(join(process.cwd(), "public", bg)), bg).toBe(true);
    });
  }
});
