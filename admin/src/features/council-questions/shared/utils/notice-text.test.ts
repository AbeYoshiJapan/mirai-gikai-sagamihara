import { describe, expect, it } from "vitest";
import {
  extractBillRefs,
  meetingKeyOf,
  meetingNameOf,
  parseJapaneseInt,
  parseMeetingKey,
  parseMeetingLabel,
  parseWarekiDate,
  squeeze,
  toHalfWidthDigits,
} from "./notice-text";

describe("notice-text", () => {
  it("全角数字を半角にし、空白を取る", () => {
    expect(toHalfWidthDigits("令和８年１２月")).toBe("令和8年12月");
    expect(squeeze("一　般 質 問")).toBe("一般質問");
    expect(parseJapaneseInt("１５")).toBe(15);
    expect(parseJapaneseInt("ア")).toBeNull();
  });

  it("和暦の日付を読む", () => {
    expect(parseWarekiDate("令和８年９月２４日")).toBe("2026-09-24");
    expect(parseWarekiDate("令和元年５月１日")).toBe("2019-05-01");
    expect(parseWarekiDate("９月２４日")).toBeNull();
  });

  it("定例会議の名前を読み、鍵と名前を作る", () => {
    expect(
      parseMeetingLabel("令和８年定例会９月定例会議　一般質問通告一覧")
    ).toEqual({
      year: 2026,
      month: 9,
    });
    expect(parseMeetingLabel("一般質問順位(令和８年３月定例会議)")).toEqual({
      year: 2026,
      month: 3,
    });
    expect(parseMeetingLabel("付議事件一覧")).toBeNull();
    expect(meetingKeyOf(2026, 9)).toBe("2026-09");
    expect(meetingNameOf(2026, 12)).toBe("令和8年12月定例会議");
    expect(parseMeetingKey("2026-12")).toEqual({ year: 2026, month: 12 });
    expect(parseMeetingKey("2026-13")).toBeNull();
    expect(parseMeetingKey("../x")).toBeNull();
  });

  it("文言に出てくる議案などの番号を拾う（数字は半角にそろえる）", () => {
    expect(
      extractBillRefs(
        "議案第９９号令和７年度相模原市一般会計歳入歳出決算及び議案第１０５号令和７年度…"
      )
    ).toEqual(["議案第99号", "議案第105号"]);
    expect(extractBillRefs("議提議案第８号と陳情第２０号について")).toEqual([
      "議提議案第8号",
      "陳情第20号",
    ]);
    expect(extractBillRefs("市の考え方について")).toEqual([]);
  });
});
