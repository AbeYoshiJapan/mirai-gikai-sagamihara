import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import { SAGAMIHARA_PRESET } from "./presets/sagamihara";
import {
  brandAsset,
  brandColorsToCss,
  councilWording,
  hasSessionSystemPage,
  renderLegalText,
  renderOperatorDisclaimer,
  renderSessionSystemText,
  splitSiteName,
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
    expect(pub.legal).toEqual({ modified_on: "" });
    expect(pub.features).toEqual(DEFAULT_SITE_SETTINGS.features);
  });

  it("会期の制度は短い項目だけ出し、説明本文はクライアントに載せない", () => {
    const pub = toPublicSiteSettings(SAGAMIHARA_PRESET);
    expect(pub.council.session_model).toBe("year_round");
    expect(pub.council.session_system_label).toBe("通年議会");
    expect(pub.council.session_system_summary).not.toBe("");
    expect(pub.council).not.toHaveProperty("session_system_md");
  });
});

describe("councilWording", () => {
  it("設定が空なら会期の方式から決める（定例会制は閉会中）", () => {
    expect(councilWording(DEFAULT_SITE_SETTINGS.council)).toEqual({
      sessionLabel: "定例会",
      outOfPeriod: "閉会中",
      countdownOpen: "開会まで",
      countdownClose: "閉会まで",
    });
  });

  it("通年議会で設定が空なら「会期中（○○の間）」にする", () => {
    expect(
      councilWording({
        ...DEFAULT_SITE_SETTINGS.council,
        session_model: "year_round",
        session_label: "定例会議",
      }).outOfPeriod
    ).toBe("会期中（定例会議の間）");
  });

  it("設定があればそれを使う（相模原のひな形）", () => {
    expect(councilWording(SAGAMIHARA_PRESET.council)).toEqual({
      sessionLabel: "定例会議",
      outOfPeriod: "会期中（定例会議の間）",
      countdownOpen: "開会まで",
      countdownClose: "閉会まで",
    });
  });
});

describe("hasSessionSystemPage / renderSessionSystemText", () => {
  it("制度名が空なら説明ページを出さない（既定値）", () => {
    expect(hasSessionSystemPage(DEFAULT_SITE_SETTINGS.council)).toBe(false);
    expect(hasSessionSystemPage(SAGAMIHARA_PRESET.council)).toBe(true);
    expect(hasSessionSystemPage({ session_system_label: "  " })).toBe(false);
  });

  it("説明本文に議会名と会議期間の呼称が差し込まれる", () => {
    const text = renderSessionSystemText(SAGAMIHARA_PRESET);
    expect(text).toContain("相模原市議会は、1年間を1つの会期とする");
    expect(text).toContain("年4回の定例会議");
    expect(text).not.toContain("{{");
  });
});

describe("brandAsset / brandColorsToCss", () => {
  it("空なら選んだブランド案の同梱画像、設定があればその URL", () => {
    expect(brandAsset(DEFAULT_SITE_SETTINGS.brand, "logo_url")).toBe(
      "/brand/kakehashi/logo.svg"
    );
    expect(
      brandAsset(
        { ...DEFAULT_SITE_SETTINGS.brand, preset: "ajisai" },
        "archive_hero_url"
      )
    ).toBe("/brand/ajisai/hero.png");
    // OGP は文字入りの静的画像ではなく、サイト名を設定から描く動的な画像
    expect(
      brandAsset(
        { ...DEFAULT_SITE_SETTINGS.brand, preset: "ajisai" },
        "ogp_image_url"
      )
    ).toBe("/api/og/site");
    expect(
      brandAsset(
        { ...DEFAULT_SITE_SETTINGS.brand, logo_url: "https://x.test/l.svg" },
        "logo_url"
      )
    ).toBe("https://x.test/l.svg");
  });

  it("custom で画像が空なら案1 の同梱画像に戻る", () => {
    expect(
      brandAsset(
        { ...DEFAULT_SITE_SETTINGS.brand, preset: "custom" },
        "icon_192_url"
      )
    ).toBe("/brand/kakehashi/icon-192.png");
  });

  it("CSS 変数を 4 つ出す", () => {
    const css = brandColorsToCss(DEFAULT_SITE_SETTINGS.brand.colors);
    expect(css).toContain("--primary: #1a78a0 !important;");
    expect(css).toContain("--color-mirai-gradient-end: #e8f6fa !important;");
  });
});

describe("splitSiteName", () => {
  it("＠ の前後に分ける", () => {
    expect(splitSiteName("みらい議会＠相模原市")).toEqual({
      base: "みらい議会",
      suffix: "＠相模原市",
    });
    expect(splitSiteName("mirai@sagamihara")).toEqual({
      base: "mirai",
      suffix: "@sagamihara",
    });
  });

  it("＠ が無い・先頭にあるときは分けない", () => {
    expect(splitSiteName("さがみはら議会")).toEqual({
      base: "さがみはら議会",
      suffix: "",
    });
    expect(splitSiteName("＠相模原市")).toEqual({ base: "＠相模原市", suffix: "" });
  });
});
