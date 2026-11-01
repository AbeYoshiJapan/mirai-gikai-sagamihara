import { describe, expect, it } from "vitest";
import { canPublish, checkPublishPreconditions } from "./publish-gate";

describe("checkPublishPreconditions", () => {
  it("レビュー完了の通常版は公開できる", () => {
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

  it("レビュー未完了は公開できない", () => {
    expect(
      checkPublishPreconditions({
        is_review_completed: false,
        article_kind: "standard",
      })
    ).toContain("レビュー");
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
