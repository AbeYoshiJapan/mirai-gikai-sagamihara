import { describe, expect, it } from "vitest";
import { GET } from "./route";

/**
 * AI インタビューのオープンデータ。この版では AI インタビューを使わないので
 * （掲載方針。packages/shared/src/site-settings/locked-features.ts）、
 * テスト用の DB で ai_interview を有効にしていても 404 になることを確かめる。
 */
describe("GET /api/open-data/interviews（この版では使わない）", () => {
  it("規約に同意したリクエストでも 404 を返す", async () => {
    const res = await GET(
      new Request(
        "http://localhost:3000/api/open-data/interviews?agreeToTerms=true",
        { headers: { "x-forwarded-for": "203.0.113.1" } }
      )
    );
    expect(res.status).toBe(404);
  });
});
