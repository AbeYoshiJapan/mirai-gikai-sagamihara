import { describe, expect, it } from "vitest";
import type { BillStageFields } from "./bill-status";
import {
  countByStatusGroup,
  filterByStatusGroup,
  isBillStatusGroup,
  toBillStatusGroup,
} from "./bill-status-group";

const bill = (overrides: Partial<BillStageFields> = {}): BillStageFields => ({
  bill_kind: "ordinance",
  stage: "in_committee",
  result: null,
  vote_outcome: null,
  ...overrides,
});

describe("toBillStatusGroup", () => {
  it("提出から本会議までは「審議中」に畳む", () => {
    expect(toBillStatusGroup(bill({ stage: "submitted" }))).toBe(
      "deliberating"
    );
    expect(toBillStatusGroup(bill({ stage: "referred" }))).toBe("deliberating");
    expect(toBillStatusGroup(bill({ stage: "in_committee" }))).toBe(
      "deliberating"
    );
    expect(toBillStatusGroup(bill({ stage: "plenary" }))).toBe("deliberating");
  });

  it("提出前だけが「提出前」になる", () => {
    expect(toBillStatusGroup(bill({ stage: "preparing" }))).toBe("waiting");
    expect(toBillStatusGroup(bill({ stage: null }))).toBe("waiting");
  });

  it("議決の結果で可決・否決に分かれ、継続審査は審議中", () => {
    expect(
      toBillStatusGroup(bill({ stage: "decided", result: "passed" }))
    ).toBe("enacted");
    expect(
      toBillStatusGroup(bill({ stage: "decided", result: "rejected" }))
    ).toBe("rejected");
    expect(
      toBillStatusGroup(bill({ stage: "decided", result: "continued" }))
    ).toBe("deliberating");
  });

  it("報告・計画・特別委員会は種類で分ける", () => {
    expect(toBillStatusGroup(bill({ bill_kind: "report", stage: null }))).toBe(
      "reported"
    );
    expect(toBillStatusGroup(bill({ bill_kind: "plan", stage: null }))).toBe(
      "plan"
    );
  });
});

describe("isBillStatusGroup", () => {
  it("既知のグループだけ通す", () => {
    expect(isBillStatusGroup("all")).toBe(true);
    expect(isBillStatusGroup("deliberating")).toBe(true);
  });

  it("未知の値は弾く", () => {
    expect(isBillStatusGroup("unknown")).toBe(false);
    expect(isBillStatusGroup(undefined)).toBe(false);
    expect(isBillStatusGroup(1)).toBe(false);
  });
});

describe("countByStatusGroup / filterByStatusGroup", () => {
  const bills = [
    bill({ stage: "preparing" }),
    bill({ stage: "in_committee" }),
    bill({ stage: "plenary" }),
    bill({ stage: "decided", result: "passed" }),
    bill({ stage: "decided", result: "rejected" }),
    bill({ bill_kind: "report", stage: null }),
  ];

  it("グループごとに数え、all は全件", () => {
    expect(countByStatusGroup(bills)).toEqual({
      all: 6,
      deliberating: 2,
      waiting: 1,
      enacted: 1,
      rejected: 1,
      reported: 1,
      plan: 0,
      special_committee: 0,
    });
  });

  it("all は素通し、それ以外はグループで絞る", () => {
    expect(filterByStatusGroup(bills, "all")).toHaveLength(6);
    expect(filterByStatusGroup(bills, "deliberating")).toHaveLength(2);
    expect(filterByStatusGroup(bills, "reported")).toHaveLength(1);
  });
});
