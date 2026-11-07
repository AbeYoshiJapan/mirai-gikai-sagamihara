import { describe, expect, it } from "vitest";
import { diffOutlines } from "./outline-diff";

describe("diffOutlines", () => {
  it("もう片方に無い行に印を付ける", () => {
    const result = diffOutlines(
      "1 防災について\n  (1) 避難所について",
      "1 防災について\n  (1) 避難所の運営について\n  (2) 備蓄について"
    );
    expect(result.before.map((line) => line.changed)).toEqual([false, true]);
    expect(result.after.map((line) => line.changed)).toEqual([
      false,
      true,
      true,
    ]);
    expect(result.changedCount).toBe(2);
  });

  it("同じ行が何度も出るときは、数で比べる", () => {
    const result = diffOutlines("ア 現状\nア 現状", "ア 現状");
    expect(result.before.map((line) => line.changed)).toEqual([false, true]);
    expect(result.after.map((line) => line.changed)).toEqual([false]);
    expect(result.changedCount).toBe(0);
  });
});
