import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import {
  brandAsset,
  brandColorsToCss,
  renderLegalText,
  renderOperatorDisclaimer,
  toPublicSiteSettings,
} from "./public";
import { renderTemplate } from "./templates";

describe("renderTemplate", () => {
  it("{{key}} を置き換え、未知のキーはそのまま残す", () => {
    expect(
      renderTemplate("{{a}} と {{ b }} と {{c}}", { a: "1", b: "2" })
    ).toBe("1 と 2 と {{c}}");
  });
});

describe("renderLegalText / renderOperatorDisclaimer", () => {
  it("規約にサイト名・運営者名・議会名が入る", () => {
    const s = structuredClone(DEFAULT_SITE_SETTINGS);
    s.site.name = "みらい議会＠相模原市";
    s.operator.name = "運営 太郎";
    s.operator.title = "相模原市議会議員";
    s.council.name = "相模原市議会";
    s.council.municipality = "相模原市";
    const terms = renderLegalText(s, "terms_md");
    expect(terms).toContain("「みらい議会＠相模原市」");
    expect(terms).toContain("相模原市議会議員の運営 太郎");
    expect(terms).not.toContain("{{");
    const disclaimer = renderOperatorDisclaimer(s);
    expect(disclaimer).toContain("相模原市議会・相模原市の公式サイトではありません");
  });
});

describe("toPublicSiteSettings", () => {
  it("取込・AI・SEO・法務の全文を含めない", () => {
    const pub = toPublicSiteSettings(DEFAULT_SITE_SETTINGS) as Record<
      string,
      unknown
    >;
    expect(pub).not.toHaveProperty("import");
    expect(pub).not.toHaveProperty("ai");
    expect(pub).not.toHaveProperty("seo");
    expect(pub).not.toHaveProperty("legal");
    expect(pub.features).toEqual(DEFAULT_SITE_SETTINGS.features);
  });
});

describe("brandAsset / brandColorsToCss", () => {
  it("空なら既定パス、設定があればその URL", () => {
    expect(brandAsset(DEFAULT_SITE_SETTINGS.brand, "logo_url")).toBe(
      "/img/logo.svg"
    );
    expect(
      brandAsset(
        { ...DEFAULT_SITE_SETTINGS.brand, logo_url: "https://x.test/l.svg" },
        "logo_url"
      )
    ).toBe("https://x.test/l.svg");
  });

  it("CSS 変数を 4 つ出す", () => {
    const css = brandColorsToCss(DEFAULT_SITE_SETTINGS.brand.colors);
    expect(css).toContain("--primary: #1f7a4d;");
    expect(css).toContain("--mirai-gradient-end: #d9f2e3;");
  });
});
