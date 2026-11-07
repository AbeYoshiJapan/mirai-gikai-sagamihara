import { describe, expect, it } from "vitest";
import {
  extractBillRefs,
  normalizeMemberName,
  parseBillNumber,
  readNoticeItems,
  toBillNumber,
} from "./types";

describe("council-questions/types", () => {
  it("DB の items を項目の木として読み、形の違うものは捨てる", () => {
    expect(
      readNoticeItems([
        {
          label: "1",
          level: 1,
          text: "物価高騰対策について",
          children: [{ label: "(1)", level: 2, text: "市の考え方について", children: [] }],
        },
        { label: "2", level: 9, text: "おかしな段" },
        "文字だけ",
      ])
    ).toEqual([
      {
        label: "1",
        level: 1,
        text: "物価高騰対策について",
        children: [{ label: "(1)", level: 2, text: "市の考え方について", children: [] }],
      },
    ]);
    expect(readNoticeItems(null)).toEqual([]);
  });

  it("氏名は空白を取って比べ、議案の番号は会議の年を付ける", () => {
    expect(normalizeMemberName("阿部　善博")).toBe("阿部善博");
    expect(toBillNumber("議案第99号", "2026-09")).toBe("令和8年議案第99号");
    expect(toBillNumber("陳情第20号", "2026-12")).toBe("令和8年陳情第20号");
    expect(toBillNumber("議案第1号", "2018-03")).toBeNull();
  });

  it("文言から議案などの番号を拾い、議案番号を年と番号に分ける", () => {
    expect(
      extractBillRefs("議案第９９号令和７年度相模原市一般会計歳入歳出決算及び議案第１０５号")
    ).toEqual(["議案第99号", "議案第105号"]);
    expect(extractBillRefs("議提議案第８号と陳情第２０号について")).toEqual([
      "議提議案第8号",
      "陳情第20号",
    ]);
    expect(parseBillNumber("令和8年議案第99号")).toEqual({
      year: 2026,
      ref: "議案第99号",
    });
    expect(parseBillNumber("令和元年議提議案第０８号")).toEqual({
      year: 2019,
      ref: "議提議案第8号",
    });
    expect(parseBillNumber("議案第99号")).toBeNull();
  });
});
