import { describe, expect, it } from "vitest";
import { shouldAutoCloseInterviewOnBillStage } from "./should-auto-close-interview";

describe("shouldAutoCloseInterviewOnBillStage", () => {
  it("議決が確定したら true", () => {
    expect(
      shouldAutoCloseInterviewOnBillStage({
        stage: "decided",
        result: "passed",
      })
    ).toBe(true);
    expect(
      shouldAutoCloseInterviewOnBillStage({
        stage: "decided",
        result: "rejected",
      })
    ).toBe(true);
    expect(shouldAutoCloseInterviewOnBillStage({ stage: "decided" })).toBe(
      true
    );
  });

  it("継続審査は閉じない", () => {
    expect(
      shouldAutoCloseInterviewOnBillStage({
        stage: "decided",
        result: "continued",
      })
    ).toBe(false);
  });

  it.each([
    ["preparing"],
    ["submitted"],
    ["referred"],
    ["in_committee"],
    ["plenary"],
  ] as const)("%s は閉じない", (stage) => {
    expect(shouldAutoCloseInterviewOnBillStage({ stage })).toBe(false);
  });

  it("旧来の status=enacted でも閉じる", () => {
    expect(shouldAutoCloseInterviewOnBillStage({ status: "enacted" })).toBe(
      true
    );
    expect(shouldAutoCloseInterviewOnBillStage({ status: "introduced" })).toBe(
      false
    );
    expect(shouldAutoCloseInterviewOnBillStage({})).toBe(false);
  });
});
