import { describe, expect, it } from "vitest";
import { buildSitePreviewUrl } from "./build-site-preview-url";

describe("buildSitePreviewUrl", () => {
  it("合言葉が無ければ null", () => {
    expect(buildSitePreviewUrl("https://example.jp", undefined)).toBeNull();
    expect(buildSitePreviewUrl("https://example.jp", "")).toBeNull();
  });

  it("web の /api/site-preview にトークンを付ける", () => {
    expect(buildSitePreviewUrl("https://example.jp", "s3cr3t/+")).toBe(
      "https://example.jp/api/site-preview?token=s3cr3t%2F%2B"
    );
  });
});
