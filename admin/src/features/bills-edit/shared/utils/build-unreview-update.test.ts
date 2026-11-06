import { describe, expect, it } from "vitest";
import { buildUnreviewUpdate } from "./build-unreview-update";

describe("buildUnreviewUpdate", () => {
  it("公開中の議案は、確認を外して下書きに戻す", () => {
    expect(buildUnreviewUpdate("published")).toEqual({
      is_review_completed: false,
      publish_status: "draft",
    });
  });

  it("下書き・公開予定の議案は、確認だけを外して状態は変えない", () => {
    expect(buildUnreviewUpdate("draft")).toEqual({
      is_review_completed: false,
    });
    expect(buildUnreviewUpdate("coming_soon")).toEqual({
      is_review_completed: false,
    });
  });
});
