import { describe, expect, it } from "vitest";
import {
  isSitePreviewCookieValid,
  isSitePreviewTokenValid,
} from "./site-preview";

describe("site-preview", () => {
  it("合言葉が未設定なら常に無効（公開前サイトは誰にも見せない）", () => {
    expect(isSitePreviewCookieValid("abc", undefined)).toBe(false);
    expect(isSitePreviewTokenValid("abc", undefined)).toBe(false);
    expect(isSitePreviewCookieValid("", "")).toBe(false);
  });

  it("合言葉と一致するときだけ有効", () => {
    expect(isSitePreviewCookieValid("secret", "secret")).toBe(true);
    expect(isSitePreviewCookieValid("secret ", "secret")).toBe(false);
    expect(isSitePreviewTokenValid("secret", "secret")).toBe(true);
    expect(isSitePreviewTokenValid(null, "secret")).toBe(false);
  });
});
