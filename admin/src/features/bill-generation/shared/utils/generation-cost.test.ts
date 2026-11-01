import { describe, expect, it } from "vitest";
import { calculateGenerationCostUsd } from "./generation-cost";

describe("calculateGenerationCostUsd", () => {
  it("入力・出力トークンから概算する", () => {
    expect(
      calculateGenerationCostUsd("openai/gpt-5-mini", {
        inputTokens: 20_000,
        outputTokens: 4_000,
      })
    ).toBe(0.013);
  });

  it("料金表に無いモデルや使用量不明は null", () => {
    expect(
      calculateGenerationCostUsd("unknown/model", {
        inputTokens: 1,
        outputTokens: 1,
      })
    ).toBeNull();
    expect(
      calculateGenerationCostUsd("openai/gpt-5-mini", undefined)
    ).toBeNull();
  });
});
