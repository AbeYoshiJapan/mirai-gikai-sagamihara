import { describe, expect, it } from "vitest";
import {
  parseBillIdFilter,
  parseOpinionInboxFilter,
  parseQuestionInboxFilter,
} from "./inbox-filter";

describe("inbox-filter", () => {
  it("意見の絞り込みは未指定・不正なら未対応", () => {
    expect(parseOpinionInboxFilter(undefined)).toBe("received");
    expect(parseOpinionInboxFilter("bogus")).toBe("received");
    expect(parseOpinionInboxFilter("published")).toBe("published");
    expect(parseOpinionInboxFilter(["rejected", "x"])).toBe("rejected");
    expect(parseOpinionInboxFilter("all")).toBe("all");
    // 質問だけにある状態は意見では使えない
    expect(parseOpinionInboxFilter("answered")).toBe("received");
  });

  it("質問の絞り込みは未指定・不正なら未回答", () => {
    expect(parseQuestionInboxFilter(undefined)).toBe("received");
    expect(parseQuestionInboxFilter("answered")).toBe("answered");
    expect(parseQuestionInboxFilter("closed")).toBe("closed");
    expect(parseQuestionInboxFilter("rejected")).toBe("received");
  });

  it("billId は UUID のときだけ使う", () => {
    expect(parseBillIdFilter(undefined)).toBeNull();
    expect(parseBillIdFilter("abc")).toBeNull();
    expect(parseBillIdFilter("bda02b2e-2e40-4905-93ed-af8d67bafd45")).toBe(
      "bda02b2e-2e40-4905-93ed-af8d67bafd45"
    );
  });
});
