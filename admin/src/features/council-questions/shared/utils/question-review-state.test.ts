import { describe, expect, it } from "vitest";
import {
  getQuestionReviewState,
  isNoticeContentEdited,
  type NoticeContentFields,
} from "./question-review-state";

describe("getQuestionReviewState", () => {
  it("公式の変更・削除の保留を先に知らせ、なければ公開中か仮登録", () => {
    expect(
      getQuestionReviewState({ is_published: false, pending_update: null })
    ).toBe("provisional");
    expect(
      getQuestionReviewState({ is_published: true, pending_update: null })
    ).toBe("published");
    expect(
      getQuestionReviewState({
        is_published: true,
        pending_update: { kind: "removed", detectedAt: "2026-11-07T00:00:00Z" },
      })
    ).toBe("removed");
    expect(
      getQuestionReviewState({
        is_published: true,
        pending_update: {
          kind: "changed",
          detectedAt: "2026-11-07T00:00:00Z",
          draft: {
            seatNumber: 1,
            memberName: "x",
            factionLabel: "",
            method: null,
            questionDate: null,
            noticeDate: null,
            items: [],
            sourceUrl: null,
          },
        },
      })
    ).toBe("changed");
  });
});

describe("isNoticeContentEdited", () => {
  const current: NoticeContentFields = {
    kind: "general",
    seat_number: 45,
    member_name: "阿部善博",
    faction_label: "自民党",
    method: "一問一答",
    question_date: "2026-06-30",
    items: [
      {
        label: "1",
        level: 1,
        text: "防災の取組について",
        children: [],
      },
    ],
  };

  it("同じ内容（項目のキーの順番が違うだけでも）なら、手を入れたことにしない", () => {
    expect(
      isNoticeContentEdited(current, {
        ...current,
        items: [
          { children: [], text: "防災の取組について", level: 1, label: "1" },
        ],
      })
    ).toBe(false);
  });

  it("項目の文言・区分・質問日を直したら、手を入れたことにする", () => {
    expect(
      isNoticeContentEdited(current, {
        ...current,
        items: [{ ...current.items[0], text: "防災について" }],
      })
    ).toBe(true);
    expect(
      isNoticeContentEdited(current, { ...current, kind: "individual" })
    ).toBe(true);
    expect(
      isNoticeContentEdited(current, { ...current, question_date: null })
    ).toBe(true);
  });
});
