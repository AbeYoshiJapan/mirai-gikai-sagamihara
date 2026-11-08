import { describe, expect, it } from "vitest";
import {
  buildXIntentUrl,
  countXWeight,
  truncateToXWeight,
  X_URL_WEIGHT,
} from "./x-text";

describe("countXWeight", () => {
  it("英数字は 1、日本語は 2 と数える", () => {
    expect(countXWeight("abc 123")).toBe(7);
    expect(countXWeight("相模原")).toBe(6);
    expect(countXWeight("【議案】")).toBe(8);
    expect(countXWeight("a\nb")).toBe(3);
  });

  it("URL は長さにかかわらず 23 と数える", () => {
    expect(
      countXWeight("見る https://example.com/bills/very-long-path?x=1")
    ).toBe(4 + 1 + X_URL_WEIGHT);
    expect(countXWeight("https://a.jp https://b.jp")).toBe(
      X_URL_WEIGHT * 2 + 1
    );
  });
});

describe("truncateToXWeight", () => {
  it("収まるならそのまま、収まらなければ後ろを切って「…」を付ける", () => {
    expect(truncateToXWeight("相模原市", 8)).toBe("相模原市");
    // 「…」も 2 と数えるので、残りは 4（2 文字）
    expect(truncateToXWeight("相模原市議会", 6)).toBe("相模…");
    expect(truncateToXWeight("相模原市議会", 1)).toBe("");
  });
});

describe("buildXIntentUrl", () => {
  it("本文を入れた投稿画面の URL を作る", () => {
    expect(buildXIntentUrl("議案 #相模原市議会")).toBe(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent("議案 #相模原市議会")}`
    );
  });
});
