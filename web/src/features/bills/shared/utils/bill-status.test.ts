import { describe, expect, it } from "vitest";
import {
  type BillStageFields,
  getCardStatusLabel,
  getDateLabel,
  getStatusVariant,
} from "./bill-status";

const bill = (overrides: Partial<BillStageFields> = {}): BillStageFields => ({
  bill_kind: "ordinance",
  stage: "in_committee",
  result: null,
  vote_outcome: null,
  ...overrides,
});

describe("getCardStatusLabel", () => {
  it("審議中はサイト設定の文言、無ければ「審議中」", () => {
    expect(getCardStatusLabel(bill())).toBe("審議中");
    expect(getCardStatusLabel(bill(), { inProgress: "市議会審議中" })).toBe(
      "市議会審議中"
    );
  });

  it("議決済みは結果、提出前は「提出前」、報告は種類名", () => {
    expect(
      getCardStatusLabel(bill({ stage: "decided", result: "passed" }))
    ).toBe("可決");
    expect(getCardStatusLabel(bill({ stage: "preparing" }))).toBe("提出前");
    expect(getCardStatusLabel(bill({ bill_kind: "report", stage: null }))).toBe(
      "委員会報告"
    );
  });
});

describe("getStatusVariant", () => {
  it("審議中は light、可決は default、否決は dark、それ以外は muted", () => {
    expect(getStatusVariant(bill())).toBe("light");
    expect(getStatusVariant(bill({ stage: "decided", result: "passed" }))).toBe(
      "default"
    );
    expect(
      getStatusVariant(bill({ stage: "decided", result: "rejected" }))
    ).toBe("dark");
    expect(getStatusVariant(bill({ stage: "preparing" }))).toBe("muted");
  });
});

describe("getDateLabel", () => {
  it("種類ごとの言葉", () => {
    expect(getDateLabel({ bill_kind: "ordinance" })).toBe("提出");
    expect(getDateLabel({ bill_kind: "report" })).toBe("報告");
    expect(getDateLabel({ bill_kind: "special_committee" })).toBe("開催");
    expect(getDateLabel({ bill_kind: "plan" })).toBe("掲載");
  });
});
