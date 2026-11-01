import { describe, expect, it } from "vitest";
import { getJstMonthRange, isOverMonthlyCap } from "./cost-cap";

describe("isOverMonthlyCap", () => {
  it("上限 0 以下は無制限", () => {
    expect(isOverMonthlyCap(1000, 0)).toBe(false);
    expect(isOverMonthlyCap(1000, -1)).toBe(false);
  });

  it("上限に達したら止める", () => {
    expect(isOverMonthlyCap(19.99, 20)).toBe(false);
    expect(isOverMonthlyCap(20, 20)).toBe(true);
    expect(isOverMonthlyCap(25, 20)).toBe(true);
  });
});

describe("getJstMonthRange", () => {
  it("JST の月初 0 時から翌月初 0 時まで", () => {
    // 2026-11-01 00:30 JST = 2026-10-31T15:30Z
    const range = getJstMonthRange(new Date("2026-10-31T15:30:00Z"));
    expect(range.from).toBe("2026-10-31T15:00:00.000Z");
    expect(range.to).toBe("2026-11-30T15:00:00.000Z");
  });

  it("月末の JST 23 時台も同じ月", () => {
    // 2026-11-30 23:30 JST = 2026-11-30T14:30Z
    const range = getJstMonthRange(new Date("2026-11-30T14:30:00Z"));
    expect(range.from).toBe("2026-10-31T15:00:00.000Z");
  });
});
