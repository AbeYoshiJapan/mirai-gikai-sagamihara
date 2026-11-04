import { describe, expect, it } from "vitest";
import {
  parseMeetingPeriods,
  validateMeetingPeriods,
} from "./meeting-periods";

const june = {
  name: "6月定例会議",
  start_date: "2026-05-28",
  end_date: "2026-06-26",
};
const december = {
  name: "12月定例会議",
  start_date: "2026-11-26",
  end_date: "2026-12-18",
};

describe("parseMeetingPeriods", () => {
  it("正しい配列を開始日順に返す", () => {
    expect(parseMeetingPeriods([december, june])).toEqual([june, december]);
  });

  it("配列でない・壊れた JSON は空配列にする", () => {
    expect(parseMeetingPeriods(null)).toEqual([]);
    expect(parseMeetingPeriods("[]")).toEqual([]);
    expect(parseMeetingPeriods([{ name: "x" }])).toEqual([]);
    expect(
      parseMeetingPeriods([{ ...june, start_date: "2026/05/28" }])
    ).toEqual([]);
  });

  it("終了日が開始日より前の要素があれば全体を空にする", () => {
    expect(
      parseMeetingPeriods([
        { name: "a", start_date: "2026-06-26", end_date: "2026-05-28" },
      ])
    ).toEqual([]);
  });
});

describe("validateMeetingPeriods", () => {
  const session = { start_date: "2026-04-01", end_date: "2027-03-31" };

  it("問題がなければ null", () => {
    expect(validateMeetingPeriods([june, december], session)).toBeNull();
    expect(validateMeetingPeriods([], session)).toBeNull();
  });

  it("名前が空なら何件目かを付けて返す", () => {
    expect(
      validateMeetingPeriods([june, { ...december, name: " " }], session)
    ).toBe("2件目の期間: 期間の名前を入力してください");
  });

  it("日付の形式が違えば弾く", () => {
    expect(
      validateMeetingPeriods([{ ...june, end_date: "2026-6-26" }], session)
    ).toBe("1件目の期間: 日付は YYYY-MM-DD の形式で入力してください");
  });

  it("終了日が開始日より前なら弾く", () => {
    expect(
      validateMeetingPeriods(
        [{ ...june, start_date: "2026-06-27" }],
        session
      )
    ).toBe("1件目の期間: 終了日は開始日以降の日付を指定してください");
  });

  it("会期の外にはみ出す期間を弾く", () => {
    expect(
      validateMeetingPeriods(
        [{ name: "3月定例会議", start_date: "2027-03-01", end_date: "2027-04-02" }],
        session
      )
    ).toBe(
      "「3月定例会議」は会期の期間（2026-04-01〜2027-03-31）の中に収めてください"
    );
  });

  it("重なる期間を弾く", () => {
    expect(
      validateMeetingPeriods(
        [june, { name: "臨時会議", start_date: "2026-06-26", end_date: "2026-06-26" }],
        session
      )
    ).toBe("「6月定例会議」と「臨時会議」の期間が重なっています");
  });
});
