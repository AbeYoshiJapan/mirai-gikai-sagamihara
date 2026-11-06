import { describe, expect, it } from "vitest";
import { POST } from "./route";

/**
 * この版では AI インタビューを使わない（掲載方針。
 * packages/shared/src/site-settings/locked-features.ts）。
 * テスト用の DB で ai_interview を有効にしていても（vitest.integration.setup.ts）、
 * ルートは存在しない扱い（404）になることを確かめる。
 */
describe("POST /api/interview/complete（この版では使わない）", () => {
  it("設定で有効にしていても 404 を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1", isPublic: true }),
      })
    );
    expect(res.status).toBe(404);
  });
});
