import { describe, expect, it } from "vitest";
import {
  type BillStageInfo,
  getBillDecisionLabel,
  getBillOutcomeLabel,
  getBillOutcomeVariant,
  getBillProgressStep,
  isDecided,
  isInDeliberation,
  toBillStageGroup,
} from "./labels";

const bill = (overrides: Partial<BillStageInfo> = {}): BillStageInfo => ({
  bill_kind: "ordinance",
  stage: "in_committee",
  result: null,
  vote_outcome: null,
  ...overrides,
});

describe("getBillOutcomeLabel", () => {
  it("審議中は inProgress の文言（既定は「審議中」）", () => {
    expect(getBillOutcomeLabel(bill())).toBe("審議中");
    expect(
      getBillOutcomeLabel(bill(), { inProgress: "市議会審議中" })
    ).toBe("市議会審議中");
  });

  it("議決済みは結果を出し、設定で言い換えられる", () => {
    const decided = bill({ stage: "decided", result: "passed" });
    expect(getBillOutcomeLabel(decided)).toBe("可決");
    expect(
      getBillOutcomeLabel(decided, { result: { passed: "可決・成立" } })
    ).toBe("可決・成立");
  });

  it("提出前・段階なしは「提出前」", () => {
    expect(getBillOutcomeLabel(bill({ stage: "preparing" }))).toBe("提出前");
    expect(getBillOutcomeLabel(bill({ stage: null }))).toBe("提出前");
  });

  it("報告・計画・特別委員会は種類名", () => {
    expect(getBillOutcomeLabel(bill({ bill_kind: "report", stage: null }))).toBe(
      "委員会報告"
    );
    expect(getBillOutcomeLabel(bill({ bill_kind: "plan", stage: null }))).toBe(
      "行政計画"
    );
  });

  it("継続審査は結果として出る", () => {
    expect(
      getBillOutcomeLabel(bill({ stage: "decided", result: "continued" }))
    ).toBe("継続審査");
  });
});

describe("getBillDecisionLabel", () => {
  it("採決結果があれば括弧で添える", () => {
    expect(
      getBillDecisionLabel(
        bill({ stage: "decided", result: "passed", vote_outcome: "majority" })
      )
    ).toBe("可決（賛成多数）");
    expect(
      getBillDecisionLabel(
        bill({ stage: "decided", result: "rejected", vote_outcome: "minority" })
      )
    ).toBe("否決（賛成少数）");
  });

  it("採決なし・継続審査・未議決は結果だけか null", () => {
    expect(
      getBillDecisionLabel(
        bill({ stage: "decided", result: "approved", vote_outcome: "none" })
      )
    ).toBe("承認");
    expect(
      getBillDecisionLabel(
        bill({ stage: "decided", result: "continued", vote_outcome: "majority" })
      )
    ).toBe("継続審査");
    expect(getBillDecisionLabel(bill())).toBeNull();
    expect(getBillDecisionLabel(bill({ bill_kind: "report" }))).toBeNull();
  });
});

describe("toBillStageGroup", () => {
  it("種類と段階と結果でタブのグループに畳む", () => {
    expect(toBillStageGroup(bill())).toBe("deliberating");
    expect(toBillStageGroup(bill({ stage: "preparing" }))).toBe("waiting");
    expect(toBillStageGroup(bill({ stage: "decided", result: "passed" }))).toBe(
      "enacted"
    );
    expect(
      toBillStageGroup(bill({ stage: "decided", result: "consented" }))
    ).toBe("enacted");
    expect(
      toBillStageGroup(bill({ stage: "decided", result: "not_adopted" }))
    ).toBe("rejected");
    expect(
      toBillStageGroup(bill({ stage: "decided", result: "withdrawn" }))
    ).toBe("rejected");
    expect(
      toBillStageGroup(bill({ stage: "decided", result: "continued" }))
    ).toBe("deliberating");
    expect(toBillStageGroup(bill({ bill_kind: "report" }))).toBe("reported");
    expect(toBillStageGroup(bill({ bill_kind: "special_committee" }))).toBe(
      "special_committee"
    );
  });
});

describe("isDecided / isInDeliberation", () => {
  it("継続審査は議決済み扱いにせず審議中にする", () => {
    const continued = bill({ stage: "decided", result: "continued" });
    expect(isDecided(continued)).toBe(false);
    expect(isInDeliberation(continued)).toBe(true);
  });

  it("可決は議決済み", () => {
    const passed = bill({ stage: "decided", result: "passed" });
    expect(isDecided(passed)).toBe(true);
    expect(isInDeliberation(passed)).toBe(false);
  });

  it("報告は審議の流れに乗らない", () => {
    const report = bill({ bill_kind: "report", stage: null });
    expect(isDecided(report)).toBe(false);
    expect(isInDeliberation(report)).toBe(false);
  });
});

describe("getBillProgressStep / getBillOutcomeVariant", () => {
  it("段階に応じた 0〜5 のステップ。報告は null", () => {
    expect(getBillProgressStep(bill({ stage: "preparing" }))).toBe(0);
    expect(getBillProgressStep(bill({ stage: "submitted" }))).toBe(1);
    expect(getBillProgressStep(bill({ stage: "referred" }))).toBe(2);
    expect(getBillProgressStep(bill({ stage: "in_committee" }))).toBe(3);
    expect(getBillProgressStep(bill({ stage: "plenary" }))).toBe(4);
    expect(getBillProgressStep(bill({ stage: "decided", result: "passed" }))).toBe(
      5
    );
    expect(
      getBillProgressStep(bill({ stage: "decided", result: "continued" }))
    ).toBe(3);
    expect(getBillProgressStep(bill({ bill_kind: "plan" }))).toBeNull();
  });

  it("色分けはグループに従う", () => {
    expect(getBillOutcomeVariant(bill())).toBe("light");
    expect(
      getBillOutcomeVariant(bill({ stage: "decided", result: "passed" }))
    ).toBe("default");
    expect(
      getBillOutcomeVariant(bill({ stage: "decided", result: "rejected" }))
    ).toBe("dark");
    expect(getBillOutcomeVariant(bill({ bill_kind: "report" }))).toBe("muted");
  });
});
