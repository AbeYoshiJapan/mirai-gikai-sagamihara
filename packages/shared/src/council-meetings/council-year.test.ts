import { describe, expect, it } from "vitest";
import { councilYearOf, councilYearOfDateKey } from "./council-year";

describe("councilYearOf / councilYearOfDateKey", () => {
  it("4 月始まり：3 月までは前の年度", () => {
    expect(councilYearOfDateKey("2026-11-17", 4)).toBe(2026);
    expect(councilYearOfDateKey("2027-03-31", 4)).toBe(2026);
    expect(councilYearOfDateKey("2027-04-01", 4)).toBe(2027);
  });

  it("Date でも同じ", () => {
    expect(councilYearOf(new Date(2027, 2, 31), 4)).toBe(2026);
    expect(councilYearOf(new Date(2026, 4, 1))).toBe(2026);
    expect(councilYearOf(new Date(2026, 3, 30))).toBe(2025);
  });
});
