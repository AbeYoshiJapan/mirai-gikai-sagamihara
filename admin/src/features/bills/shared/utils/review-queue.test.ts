import { describe, expect, it } from "vitest";
import { summarizeReviewQueue } from "./review-queue";

describe("summarizeReviewQueue", () => {
  it("公開中・未確認の下書き・確認済み未公開に分ける", () => {
    expect(
      summarizeReviewQueue([
        { publish_status: "published", is_review_completed: true },
        { publish_status: "draft", is_review_completed: false },
        { publish_status: "coming_soon", is_review_completed: false },
        { publish_status: "draft", is_review_completed: true },
      ])
    ).toEqual({ published: 1, awaitingReview: 2, reviewedUnpublished: 1 });
  });

  it("空なら全部 0", () => {
    expect(summarizeReviewQueue([])).toEqual({
      published: 0,
      awaitingReview: 0,
      reviewedUnpublished: 0,
    });
  });
});
