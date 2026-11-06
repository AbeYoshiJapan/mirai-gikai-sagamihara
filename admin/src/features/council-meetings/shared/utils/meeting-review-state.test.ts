import { describe, expect, it } from "vitest";
import {
  describePendingChanges,
  getMeetingReviewState,
  needsReview,
  readPendingUpdate,
} from "./meeting-review-state";

describe("getMeetingReviewState", () => {
  it("非公開は仮登録、公開中で保留が無ければ公開中", () => {
    expect(
      getMeetingReviewState({ is_published: false, pending_update: null })
    ).toBe("provisional");
    expect(
      getMeetingReviewState({ is_published: true, pending_update: null })
    ).toBe("published");
  });

  it("公式サイトの変更・削除の保留があれば、それを優先して出す", () => {
    expect(
      getMeetingReviewState({
        is_published: true,
        pending_update: { kind: "changed", fields: { place: "第1委員会室" } },
      })
    ).toBe("changed");
    expect(
      getMeetingReviewState({
        is_published: true,
        pending_update: { kind: "removed", fetched_at: "x" },
      })
    ).toBe("removed");
  });

  it("確認待ちは公開中（保留なし）以外", () => {
    expect(needsReview({ is_published: true, pending_update: null })).toBe(
      false
    );
    expect(needsReview({ is_published: false, pending_update: null })).toBe(
      true
    );
  });
});

describe("readPendingUpdate / describePendingChanges", () => {
  it("形の違う値は無視する", () => {
    expect(readPendingUpdate({ kind: "changed" })).toBeNull();
    expect(readPendingUpdate("x")).toBeNull();
  });

  it("変更を「項目：前 → 後」で説明する", () => {
    const pending = readPendingUpdate({
      kind: "changed",
      fields: { start_time: "午後1時", place: null },
      previous: { start_time: "午前10時", place: "本会議場" },
      fetched_at: "x",
    });
    expect(describePendingChanges(pending)).toEqual([
      "開始：午前10時 → 午後1時",
      "場所：本会議場 → （なし）",
    ]);
  });
});
