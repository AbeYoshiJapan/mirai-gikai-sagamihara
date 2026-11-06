import { describe, expect, it } from "vitest";
import {
  formatDateWithWeekday,
  meetingListRange,
  parseMeetingListView,
  selectMeetingsForView,
} from "./meeting-views";

describe("parseMeetingListView", () => {
  it("知らない値は確認待ち", () => {
    expect(parseMeetingListView("upcoming")).toBe("upcoming");
    expect(parseMeetingListView("past")).toBe("past");
    expect(parseMeetingListView(undefined)).toBe("review");
    expect(parseMeetingListView("x")).toBe("review");
  });
});

describe("meetingListRange", () => {
  it("これからは今日から 1 年、過去は昨日まで 1 年、確認待ちは 60 日前から", () => {
    expect(meetingListRange("upcoming", "2026-11-06")).toEqual({
      from: "2026-11-06",
      to: "2027-11-06",
    });
    expect(meetingListRange("past", "2026-11-06")).toEqual({
      from: "2025-11-06",
      to: "2026-11-05",
    });
    expect(meetingListRange("review", "2026-11-06").from).toBe("2026-09-07");
  });
});

describe("selectMeetingsForView", () => {
  const meetings = [
    { id: "a", is_published: true, pending_update: null },
    { id: "b", is_published: false, pending_update: null },
    { id: "c", is_published: true, pending_update: { kind: "removed" } },
  ];

  it("確認待ちは、仮登録と公式サイトの変更・削除があるもの", () => {
    expect(selectMeetingsForView(meetings, "review").map((m) => m.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("過去は新しい順", () => {
    expect(selectMeetingsForView(meetings, "past").map((m) => m.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});

describe("formatDateWithWeekday", () => {
  it("曜日を付ける", () => {
    expect(formatDateWithWeekday("2026-11-17")).toBe("2026/11/17（火）");
    expect(formatDateWithWeekday("2026-11-01")).toBe("2026/11/1（日）");
  });
});
