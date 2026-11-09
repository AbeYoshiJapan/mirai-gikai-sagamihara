import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { SAGAMIHARA_PRESET } from "./presets/sagamihara";
import {
  parseSection,
  resolveSiteSettings,
  withSettingsDefaults,
} from "./resolve";
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

  it("保存値で AI チャット・AI インタビューが true でも、読み込むと false になる", () => {
    const { settings } = resolveSiteSettings([
      { key: "features", value: { ai_chat: true, ai_interview: true } },
    ]);
    expect(settings.features.ai_chat).toBe(false);
    expect(settings.features.ai_interview).toBe(false);
  });

  it("利用者向け AI 機能は既定でオフ", () => {
    expect(DEFAULT_SITE_SETTINGS.features.ai_chat).toBe(false);
    expect(DEFAULT_SITE_SETTINGS.features.ai_interview).toBe(false);
    expect(DEFAULT_SITE_SETTINGS.features.topic_analysis).toBe(false);
  });
});

describe("withSettingsDefaults", () => {
  it("前の版のキャッシュに無い項目は既定値で埋め、ある項目はそのまま残す", () => {
    const cached = structuredClone(SAGAMIHARA_PRESET) as unknown as Record<
      string,
      Record<string, unknown>
    >;
    cached.site.name = "保存したサイト名";
    delete cached.site.inquiry_intro;
    delete cached.site.collaboration_md;
    delete cached.features.council_questions;

    const filled = withSettingsDefaults(
      cached as unknown as typeof SAGAMIHARA_PRESET
    );
    expect(filled.site.name).toBe("保存したサイト名");
    expect(filled.site.inquiry_intro).toBe(
      DEFAULT_SITE_SETTINGS.site.inquiry_intro
    );
    expect(filled.site.collaboration_md).toBe(
      DEFAULT_SITE_SETTINGS.site.collaboration_md
    );
    expect(filled.features.council_questions).toBe(false);
    expect(siteSettingsSchema.safeParse(filled).success).toBe(true);
  });
});

describe("parseSection", () => {
  it("部分入力を既定値で補って返す", () => {
    const parsed = parseSection("features", { topic_analysis: true });
    expect(parsed.topic_analysis).toBe(true);
    expect(parsed.schedule).toBe(DEFAULT_SITE_SETTINGS.features.schedule);
  });

  it("AI チャット・AI インタビューは、true が送られても false で保存する（掲載方針）", () => {
    const parsed = parseSection("features", {
      ai_chat: true,
      ai_interview: true,
    });
    expect(parsed.ai_chat).toBe(false);
    expect(parsed.ai_interview).toBe(false);
  });

  it("不正な URL は拒否する", () => {
    expect(() => parseSection("links", { fork_repo: "github.com/x" })).toThrow();
  });

  it("空文字の URL は未設定として受け付ける", () => {
    expect(parseSection("links", { fork_repo: "" }).fork_repo).toBe("");
  });
});
