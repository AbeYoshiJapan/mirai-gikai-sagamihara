import { describe, expect, it } from "vitest";
import { getBillStatusLabel } from "./index";

describe("getBillStatusLabel", () => {
  it("審議中・提出前・結果の表示", () => {
    expect(
      getBillStatusLabel({
        bill_kind: "ordinance",
        stage: "in_committee",
        result: null,
        vote_outcome: null,
      })
    ).toBe("審議中");
    expect(
      getBillStatusLabel({
        bill_kind: "ordinance",
        stage: "preparing",
        result: null,
        vote_outcome: null,
      })
    ).toBe("提出前");
    expect(
      getBillStatusLabel({
        bill_kind: "ordinance",
        stage: "decided",
        result: "passed",
        vote_outcome: "majority",
      })
    ).toBe("可決（賛成多数）");
  });

  it("報告・計画は種類名", () => {
    expect(
      getBillStatusLabel({
        bill_kind: "report",
        stage: null,
        result: null,
        vote_outcome: null,
      })
    ).toBe("委員会報告");
  });
});
