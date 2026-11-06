import { describe, expect, it } from "vitest";
import { canPublish, checkPublishPreconditions } from "./publish-gate";

describe("checkPublishPreconditions", () => {
  it("確認済みの通常版は公開できる", () => {
    expect(
      checkPublishPreconditions({
        is_review_completed: true,
        article_kind: "standard",
      })
    ).toBeNull();
    expect(
      canPublish({ is_review_completed: true, article_kind: "standard" })
    ).toBe(true);
  });

  it("未確認は公開できない", () => {
    expect(
      checkPublishPreconditions({
        is_review_completed: false,
        article_kind: "standard",
      })
    ).toContain("「記事を確認しました」を押してください");
  });

  it("AI自動生成版は確認して通常版にするまで公開できない", () => {
    expect(
      checkPublishPreconditions({
        is_review_completed: false,
        article_kind: "ai_generated",
      })
    ).toContain("AI自動生成版");
    expect(
      canPublish({ is_review_completed: false, article_kind: "ai_generated" })
    ).toBe(false);
  });
});
