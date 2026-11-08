import { afterAll, describe, expect, it } from "vitest";
import {
  deletePrPostLog,
  findRecentPrPostLogs,
  insertPrPostLog,
} from "../../admin/src/features/pr/server/repositories/pr-repository";
import { groupLogsByKey } from "../../admin/src/features/pr/shared/utils/pr-drafts";
import { adminClient } from "../supabase/utils";

// ほかのテストの記録と重ならない話題の ID
const SOURCE_ID = `test-pr-${Date.now()}`;

describe("PR・広報：投稿したことの記録", () => {
  afterAll(async () => {
    await adminClient.from("pr_post_logs").delete().eq("source_id", SOURCE_ID);
  });

  it("記録して、話題ごとに新しい順で読み、取り消せる", async () => {
    await insertPrPostLog({
      sourceType: "council_questions",
      sourceId: SOURCE_ID,
      body: "1回目",
      postedBy: null,
    });
    await insertPrPostLog({
      sourceType: "council_questions",
      sourceId: SOURCE_ID,
      body: "2回目",
      postedBy: null,
    });

    const logs = await findRecentPrPostLogs(300);
    expect(logs).not.toBeNull();
    const mine = groupLogsByKey(logs ?? [])[`council_questions:${SOURCE_ID}`];
    expect(mine.map((log) => log.body)).toEqual(["2回目", "1回目"]);

    await deletePrPostLog(mine[0].id);
    const after = groupLogsByKey((await findRecentPrPostLogs(300)) ?? [])[
      `council_questions:${SOURCE_ID}`
    ];
    expect(after.map((log) => log.body)).toEqual(["1回目"]);
  });

  it("決まった種類の話題しか記録できない（DB の制約）", async () => {
    const { error } = await adminClient.from("pr_post_logs").insert({
      source_type: "unknown",
      source_id: SOURCE_ID,
      body: "x",
    });
    expect(error?.code).toBe("23514");
  });
});
