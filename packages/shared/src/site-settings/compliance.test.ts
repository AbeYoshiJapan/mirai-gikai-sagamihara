import { describe, expect, it } from "vitest";
import { checkForkCompliance, hasComplianceErrors } from "./compliance";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { SAGAMIHARA_PRESET } from "./presets/sagamihara";
import type { SiteSettings } from "./schema";

function withOverrides(
  base: SiteSettings,
  patch: {
    site?: Partial<SiteSettings["site"]>;
    brand?: Partial<SiteSettings["brand"]>;
    links?: Partial<SiteSettings["links"]>;
    legal?: Partial<SiteSettings["legal"]>;
    operator?: Partial<SiteSettings["operator"]>;
  }
): SiteSettings {
  return {
    ...base,
    site: { ...base.site, ...patch.site },
    brand: { ...base.brand, ...patch.brand },
    links: { ...base.links, ...patch.links },
    legal: { ...base.legal, ...patch.legal },
    operator: { ...base.operator, ...patch.operator },
  };
}

describe("checkForkCompliance", () => {
  it("既定値のままだと地域名・ソース公開先が未設定としてエラーになる", () => {
    const issues = checkForkCompliance(DEFAULT_SITE_SETTINGS);
    expect(hasComplianceErrors(issues)).toBe(true);
    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("既定値のまま"),
        expect.stringContaining("ソースコード公開先"),
      ])
    );
  });

  it("相模原プリセットに公開先 URL と運営者名を足すとエラーが消える", () => {
    const settings = withOverrides(SAGAMIHARA_PRESET, {
      site: { canonical_url: "https://example.org" },
      links: { fork_repo: "https://github.com/example/mirai-gikai-sagamihara" },
      operator: { name: "相模原 太郎" },
    });
    const issues = checkForkCompliance(settings);
    expect(hasComplianceErrors(issues)).toBe(false);
    expect(issues).toEqual([]);
  });

  it("本家のテーマ色を使うとエラーになる", () => {
    const settings = withOverrides(SAGAMIHARA_PRESET, {
      brand: {
        colors: { ...SAGAMIHARA_PRESET.brand.colors, primary: "#2AA693" },
      },
      links: { fork_repo: "https://example.org/repo" },
      operator: { name: "x" },
      site: { canonical_url: "https://example.org" },
    });
    const issues = checkForkCompliance(settings);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", section: "brand" });
  });

  it("サイト名が「みらい議会＠地域名」の形式でないとエラーになる", () => {
    const settings = withOverrides(SAGAMIHARA_PRESET, {
      site: { name: "相模原市議会ウォッチ", canonical_url: "https://a.b" },
      links: { fork_repo: "https://example.org/repo" },
      operator: { name: "x" },
    });
    const issues = checkForkCompliance(settings);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("みらい議会＠地域名");
  });

  it("改変日が空なら警告（エラーではない）", () => {
    const settings = withOverrides(SAGAMIHARA_PRESET, {
      site: { canonical_url: "https://a.b" },
      links: { fork_repo: "https://example.org/repo" },
      operator: { name: "x" },
      legal: { modified_on: "" },
    });
    const issues = checkForkCompliance(settings);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("warning");
    expect(hasComplianceErrors(issues)).toBe(false);
  });
});
