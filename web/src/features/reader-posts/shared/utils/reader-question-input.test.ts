import { describe, expect, it } from "vitest";
import { parseReaderQuestionInput } from "./reader-question-input";

const validInput = {
  billId: "bda02b2e-2e40-4905-93ed-af8d67bafd45",
  body: "この条例はいつから施行されますか",
};

describe("parseReaderQuestionInput", () => {
  it("有効な入力を受け付け、省略した項目は既定値になる", () => {
    expect(parseReaderQuestionInput(validInput)).toEqual({
      ok: true,
      data: {
        ...validInput,
        contact: "",
        consentToPublish: false,
        kind: "question",
      },
    });
  });

  it("議案に紐づかない質問（billId なし）を受け付ける", () => {
    const { billId: _, ...general } = validInput;
    const result = parseReaderQuestionInput(general);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.billId).toBeUndefined();
    }
  });

  it("連絡先の前後の空白を取り除く", () => {
    const result = parseReaderQuestionInput({
      ...validInput,
      contact: " a@example.com ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contact).toBe("a@example.com");
    }
  });

  it("空白だけの本文はエラー", () => {
    expect(parseReaderQuestionInput({ ...validInput, body: " " })).toEqual({
      ok: false,
      error: "質問を入力してください",
    });
  });

  it("意見として送られたものは、種類を意見にする。知らない種類はエラー", () => {
    const result = parseReaderQuestionInput({ ...validInput, kind: "opinion" });
    expect(result.ok && result.data.kind).toBe("opinion");
    expect(parseReaderQuestionInput({ ...validInput, kind: "other" }).ok).toBe(
      false
    );
  });

  it("連絡先が長すぎればエラー", () => {
    expect(
      parseReaderQuestionInput({ ...validInput, contact: "a".repeat(201) }).ok
    ).toBe(false);
  });

  it("議案 ID が UUID でなければエラー", () => {
    expect(parseReaderQuestionInput({ ...validInput, billId: "x" })).toEqual({
      ok: false,
      error: "議案の指定が不正です",
    });
  });
});
