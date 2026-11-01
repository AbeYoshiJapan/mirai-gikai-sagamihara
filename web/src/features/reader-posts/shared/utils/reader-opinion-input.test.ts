import { describe, expect, it } from "vitest";
import {
  hasReaderPostBody,
  parseReaderOpinionInput,
} from "./reader-opinion-input";

const validInput = {
  billId: "bda02b2e-2e40-4905-93ed-af8d67bafd45",
  stance: "for",
  body: "保育園の整備を急いでほしい",
};

describe("parseReaderOpinionInput", () => {
  it("有効な入力を受け付け、省略した項目は既定値になる", () => {
    const result = parseReaderOpinionInput(validInput);
    expect(result).toEqual({
      ok: true,
      data: {
        ...validInput,
        displayName: "",
        consentToPublish: false,
      },
    });
  });

  it("任意の属性と公開同意を受け付ける", () => {
    const result = parseReaderOpinionInput({
      ...validInput,
      displayName: " さがみ ",
      residence: "inside",
      ageGroup: "40s",
      consentToPublish: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.displayName).toBe("さがみ");
      expect(result.data.residence).toBe("inside");
      expect(result.data.ageGroup).toBe("40s");
      expect(result.data.consentToPublish).toBe(true);
    }
  });

  it("賛否が無い・不正ならエラー", () => {
    const { stance: _, ...withoutStance } = validInput;
    expect(parseReaderOpinionInput(withoutStance).ok).toBe(false);
    expect(parseReaderOpinionInput({ ...validInput, stance: "maybe" })).toEqual(
      { ok: false, error: "賛否の指定が不正です" }
    );
  });

  it("空白だけの本文はエラー", () => {
    expect(parseReaderOpinionInput({ ...validInput, body: "  \n" })).toEqual({
      ok: false,
      error: "意見を入力してください",
    });
  });

  it("本文が長すぎればエラー", () => {
    expect(
      parseReaderOpinionInput({ ...validInput, body: "あ".repeat(1001) }).ok
    ).toBe(false);
  });

  it("表示名が長すぎればエラー", () => {
    expect(
      parseReaderOpinionInput({ ...validInput, displayName: "あ".repeat(31) })
        .ok
    ).toBe(false);
  });

  it("不正な属性値はエラー", () => {
    expect(
      parseReaderOpinionInput({ ...validInput, residence: "mars" }).ok
    ).toBe(false);
    expect(parseReaderOpinionInput({ ...validInput, ageGroup: "99s" }).ok).toBe(
      false
    );
  });

  it("議案 ID が UUID でなければエラー", () => {
    expect(parseReaderOpinionInput({ ...validInput, billId: "x" })).toEqual({
      ok: false,
      error: "議案の指定が不正です",
    });
  });
});

describe("hasReaderPostBody", () => {
  it("空白だけなら false", () => {
    expect(hasReaderPostBody(" \n")).toBe(false);
    expect(hasReaderPostBody("a")).toBe(true);
  });
});
