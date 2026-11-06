import { describe, expect, it } from "vitest";
import { GET } from "./route";

/**
 * 受付中の AI インタビューの一覧。この版では AI インタビューを使わないので
 * （掲載方針。packages/shared/src/site-settings/locked-features.ts）、
 * テスト用の DB で ai_interview を有効にしていても 404 になることを確かめる。
 */
describe("GET /api/open-data/interviews/open（この版では使わない）", () => {
  it("設定で有効にしていても 404 を返す", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/open-data/interviews/open", {
        headers: { "x-forwarded-for": "198.51.100.3" },
      })
    );
    expect(res.status).toBe(404);
  });
});
