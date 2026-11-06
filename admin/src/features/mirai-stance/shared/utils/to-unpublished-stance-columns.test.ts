import { describe, expect, it } from "vitest";
import { toUnpublishedStanceColumns } from "./to-unpublished-stance-columns";

describe("toUnpublishedStanceColumns", () => {
  it("公開の指定があっても、必ず非公開で保存する", () => {
    const columns = toUnpublishedStanceColumns({
      type: "for",
      isPublished: true,
    });
    expect(columns.is_published).toBe(false);
  });

  it("公開を指定したときに消える公開確認日も、指定どおり残す", () => {
    const columns = toUnpublishedStanceColumns({
      type: "for",
      isPublished: true,
      publishReviewDate: "2026-11-20",
    });
    expect(columns.publish_review_date).toBe("2026-11-20");
  });

  it("公開日時は指定どおり保存し、省略時は含めない（既存の値を保持）", () => {
    expect(
      toUnpublishedStanceColumns({
        type: "for",
        publishAt: "2026-11-17T09:00:00+09:00",
      }).publish_at
    ).toBe("2026-11-17T09:00:00+09:00");
    expect(toUnpublishedStanceColumns({ type: "for" })).not.toHaveProperty(
      "publish_at"
    );
  });

  it("賛否・理由は通常どおり変換する", () => {
    expect(
      toUnpublishedStanceColumns({
        type: "against",
        comment: "",
        reasonSummary: " 反対します。 ",
      })
    ).toMatchObject({
      type: "against",
      comment: null,
      reason_summary: "反対します。",
      is_published: false,
    });
  });
});
