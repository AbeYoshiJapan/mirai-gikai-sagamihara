import { describe, expect, it } from "vitest";
import {
  formatReaderOpinionAttributes,
  getPublicQuestionText,
  getReaderDisplayName,
  getResidenceLabel,
  parseReaderOpinionAttributes,
  READER_OPINION_STANCE_LABELS,
  READER_OPINION_STANCES,
  READER_OPINION_STATUS_LABELS,
  READER_OPINION_STATUSES,
  READER_QUESTION_STATUS_LABELS,
  READER_QUESTION_STATUSES,
} from "./labels";

describe("reader-posts labels", () => {
  it("すべての語彙に表示名がある", () => {
    for (const stance of READER_OPINION_STANCES) {
      expect(READER_OPINION_STANCE_LABELS[stance]).toBeTruthy();
    }
    for (const status of READER_OPINION_STATUSES) {
      expect(READER_OPINION_STATUS_LABELS[status]).toBeTruthy();
    }
    for (const status of READER_QUESTION_STATUSES) {
      expect(READER_QUESTION_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("parseReaderOpinionAttributes は壊れた値を空にする", () => {
    expect(parseReaderOpinionAttributes(null)).toEqual({});
    expect(parseReaderOpinionAttributes({ residence: "mars" })).toEqual({});
    expect(parseReaderOpinionAttributes({ residence: "inside" })).toEqual({
      residence: "inside",
    });
    // 想定外のキー（個人情報など）が混ざっていれば全体を捨てる
    expect(
      parseReaderOpinionAttributes({ residence: "inside", name: "山田" })
    ).toEqual({});
  });

  it("formatReaderOpinionAttributes は市名入りの居住区分と年代を並べる", () => {
    expect(
      formatReaderOpinionAttributes(
        { residence: "inside", age_group: "40s" },
        "相模原市"
      )
    ).toBe("相模原市内在住・40代");
    expect(
      formatReaderOpinionAttributes({ residence: "unknown" }, "相模原市")
    ).toBe("");
    expect(formatReaderOpinionAttributes({}, "相模原市")).toBe("");
  });

  it("getResidenceLabel", () => {
    expect(getResidenceLabel("outside", "相模原市")).toBe("相模原市外在住");
    expect(getResidenceLabel("unknown", "相模原市")).toBe("居住地は回答なし");
  });

  it("getReaderDisplayName は空なら匿名", () => {
    expect(getReaderDisplayName("  ")).toBe("匿名");
    expect(getReaderDisplayName(" さがみ ")).toBe("さがみ");
  });

  it("getPublicQuestionText は言い換えを優先する", () => {
    expect(
      getPublicQuestionText({ body: "原文", question_summary: " 言い換え " })
    ).toBe("言い換え");
    expect(getPublicQuestionText({ body: "原文", question_summary: "" })).toBe(
      "原文"
    );
  });
});
