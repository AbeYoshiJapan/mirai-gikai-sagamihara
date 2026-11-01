import { describe, expect, test } from "vitest";
import {
  calculateProgressWidth,
  getCurrentStep,
  getStatusMessage,
  getStepState,
  PROGRESS_STEPS,
} from "./bill-progress";
import type { BillStageFields } from "./bill-status";

const bill = (overrides: Partial<BillStageFields> = {}): BillStageFields => ({
  bill_kind: "ordinance",
  stage: "in_committee",
  result: null,
  vote_outcome: null,
  ...overrides,
});

describe("PROGRESS_STEPS", () => {
  test("提出 → 委員会付託 → 委員会審査 → 本会議 → 議決 の 5 段階", () => {
    expect(PROGRESS_STEPS.map((s) => s.label)).toEqual([
      "提出",
      "委員会付託",
      "委員会審査",
      "本会議",
      "議決",
    ]);
  });
});

describe("getStatusMessage", () => {
  test("提出前は補足が無ければ「提出前」", () => {
    expect(getStatusMessage(bill({ stage: "preparing" }), null)).toBe("提出前");
    expect(getStatusMessage(bill({ stage: "preparing" }), "3月提出予定")).toBe(
      "3月提出予定"
    );
  });

  test("審議中は補足をそのまま、無ければ空", () => {
    expect(getStatusMessage(bill(), "総務委員会で審査中")).toBe(
      "総務委員会で審査中"
    );
    expect(getStatusMessage(bill(), null)).toBe("");
  });
});

describe("getCurrentStep", () => {
  test("段階ごとのステップ番号。報告は null", () => {
    expect(getCurrentStep(bill({ stage: "preparing" }))).toBe(0);
    expect(getCurrentStep(bill({ stage: "submitted" }))).toBe(1);
    expect(getCurrentStep(bill({ stage: "plenary" }))).toBe(4);
    expect(getCurrentStep(bill({ stage: "decided", result: "passed" }))).toBe(
      5
    );
    expect(
      getCurrentStep(bill({ bill_kind: "report", stage: null }))
    ).toBeNull();
  });
});

describe("getStepState / calculateProgressWidth", () => {
  test("現在のステップまでが active、提出前はすべて inactive", () => {
    expect(getStepState(1, 3, false)).toBe("active");
    expect(getStepState(3, 3, false)).toBe("active");
    expect(getStepState(4, 3, false)).toBe("inactive");
    expect(getStepState(1, 0, true)).toBe("inactive");
  });

  test("最後の段階で 100%", () => {
    expect(calculateProgressWidth(0)).toBe(0);
    expect(calculateProgressWidth(5)).toBe(100);
    expect(calculateProgressWidth(3)).toBeGreaterThan(
      calculateProgressWidth(2)
    );
  });
});
