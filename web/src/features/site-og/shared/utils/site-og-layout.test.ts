import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { describe, expect, it } from "vitest";
import {
  OG_TEXT_WIDTH,
  ogTextColors,
  operatorNote,
  siteNameFontSize,
  truncateForOneLine,
} from "./site-og-layout";

describe("siteNameFontSize", () => {
  it("短い名前は大きく、長い名前ほど小さい", () => {
    expect(siteNameFontSize("みらい議会＠相模原市")).toBe(66);
    expect(siteNameFontSize("さがみはら市議会ナウ！")).toBe(56);
    expect(siteNameFontSize("みんなでみる相模原市議会＠南区")).toBe(48);
    expect(siteNameFontSize("市民とつくる相模原市議会ナビ＠南区")).toBe(40);
  });

  it("40px なら 25 文字までは 1 行の幅に入る", () => {
    expect(40 * 25).toBeLessThanOrEqual(OG_TEXT_WIDTH);
  });
});

describe("truncateForOneLine", () => {
  it("収まる文字はそのまま、超えたら「…」", () => {
    expect(truncateForOneLine("短い説明", 24)).toBe("短い説明");
    const long = "あ".repeat(60);
    const result = truncateForOneLine(long, 24);
    expect(result.endsWith("…")).toBe(true);
    expect([...result].length).toBe(Math.floor(OG_TEXT_WIDTH / 24));
  });
});

describe("ogTextColors", () => {
  it("同梱の案は案ごとの色、custom は濃い文字とテーマ色", () => {
    expect(
      ogTextColors({ ...DEFAULT_SITE_SETTINGS.brand, preset: "ginga" }).ink
    ).toBe("#ffffff");
    expect(
      ogTextColors({ ...DEFAULT_SITE_SETTINGS.brand, preset: "custom" })
    ).toEqual({
      ink: "#1f2933",
      sub: DEFAULT_SITE_SETTINGS.brand.colors.primary_accent,
      muted: "#5b6670",
    });
  });
});

describe("operatorNote", () => {
  it("肩書きを入れ、空なら「運営者」", () => {
    expect(operatorNote("相模原市議会議員")).toBe(
      "相模原市議会議員が個人で運営・公式サイトではありません"
    );
    expect(operatorNote(" ")).toBe(
      "運営者が個人で運営・公式サイトではありません"
    );
  });
});
