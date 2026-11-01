import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { SAGAMIHARA_PRESET } from "./presets/sagamihara";
import { parseSection, resolveSiteSettings } from "./resolve";
import { siteSettingsSchema } from "./schema";

describe("resolveSiteSettings", () => {
  it("行がなければ既定値をそのまま返す", () => {
    const { settings, invalidSections, storedSections } = resolveSiteSettings(
      []
    );
    expect(settings).toEqual(DEFAULT_SITE_SETTINGS);
    expect(invalidSections).toEqual([]);
    expect(storedSections).toEqual([]);
  });

  it("保存されたセクションを既定値に重ねる（足りない列は既定値）", () => {
    const { settings, storedSections } = resolveSiteSettings([
      { key: "site", value: { name: "みらい議会＠相模原市" } },
    ]);
    expect(settings.site.name).toBe("みらい議会＠相模原市");
    expect(settings.site.tagline).toBe(DEFAULT_SITE_SETTINGS.site.tagline);
    expect(storedSections).toEqual(["site"]);
  });

  it("検証に失敗したセクションは既定値に戻し、invalidSections に残す", () => {
    const { settings, invalidSections } = resolveSiteSettings([
      { key: "brand", value: { colors: { primary: "green" } } },
      { key: "site", value: { name: "有効" } },
    ]);
    expect(invalidSections).toEqual(["brand"]);
    expect(settings.brand).toEqual(DEFAULT_SITE_SETTINGS.brand);
    expect(settings.site.name).toBe("有効");
  });

  it("知らないキーは無視する", () => {
    const { settings, storedSections } = resolveSiteSettings([
      { key: "unknown", value: { a: 1 } },
    ]);
    expect(settings).toEqual(DEFAULT_SITE_SETTINGS);
    expect(storedSections).toEqual([]);
  });

  it("既定値と相模原プリセットはスキーマを満たす", () => {
    expect(siteSettingsSchema.safeParse(DEFAULT_SITE_SETTINGS).success).toBe(
      true
    );
    expect(siteSettingsSchema.safeParse(SAGAMIHARA_PRESET).success).toBe(true);
  });

  it("既定の色は本家・墨田区版の primary と違う（フォークガイドライン）", () => {
    expect(DEFAULT_SITE_SETTINGS.brand.colors.primary).not.toBe("#2aa693");
    expect(DEFAULT_SITE_SETTINGS.brand.colors.primary).not.toBe("#2a5ea8");
  });

  it("利用者向け AI 機能は既定でオフ", () => {
    expect(DEFAULT_SITE_SETTINGS.features.ai_chat).toBe(false);
    expect(DEFAULT_SITE_SETTINGS.features.ai_interview).toBe(false);
    expect(DEFAULT_SITE_SETTINGS.features.topic_analysis).toBe(false);
  });
});

describe("parseSection", () => {
  it("部分入力を既定値で補って返す", () => {
    const parsed = parseSection("features", { ai_chat: true });
    expect(parsed.ai_chat).toBe(true);
    expect(parsed.schedule).toBe(DEFAULT_SITE_SETTINGS.features.schedule);
  });

  it("不正な URL は拒否する", () => {
    expect(() => parseSection("links", { fork_repo: "github.com/x" })).toThrow();
  });

  it("空文字の URL は未設定として受け付ける", () => {
    expect(parseSection("links", { fork_repo: "" }).fork_repo).toBe("");
  });
});
