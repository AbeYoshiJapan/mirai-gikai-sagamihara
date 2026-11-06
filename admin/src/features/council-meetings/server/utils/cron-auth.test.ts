import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

describe("isCronAuthorized", () => {
  it("Bearer と合言葉が一致すれば通す", () => {
    expect(isCronAuthorized("Bearer s3cret-value", "s3cret-value")).toBe(true);
  });

  it("合言葉が違えば通さない（同じ長さでも）", () => {
    expect(isCronAuthorized("Bearer s3cret-valuX", "s3cret-value")).toBe(false);
  });

  it("ヘッダーがない・形が違うときは通さない", () => {
    expect(isCronAuthorized(null, "s3cret-value")).toBe(false);
    expect(isCronAuthorized("s3cret-value", "s3cret-value")).toBe(false);
    expect(isCronAuthorized("Bearer ", "s3cret-value")).toBe(false);
  });

  it("合言葉が空なら、だれも通さない", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
  });
});
