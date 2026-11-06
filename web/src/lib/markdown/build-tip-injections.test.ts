import { describe, expect, it } from "vitest";
import { buildTipInjections } from "./build-tip-injections";

describe("buildTipInjections", () => {
  it("指定がなければ何も差し込まない（規約・掲載方針などの文書ページ）", () => {
    expect(buildTipInjections()).toEqual([]);
    expect(buildTipInjections({})).toEqual([]);
  });

  it("AI チャットが使えないときは、AI に質問する案内を出さない", () => {
    expect(buildTipInjections({ askAi: false, difficulty: true })).toEqual([
      { targetH2Index: -1, tagName: "DifficultyInfoCard" },
    ]);
  });

  it("AI チャットが使えるときは、4 つ目の見出しの前に案内を出す", () => {
    expect(buildTipInjections({ askAi: true, difficulty: true })).toEqual([
      { targetH2Index: 3, tagName: "LongPressSection" },
      { targetH2Index: -1, tagName: "DifficultyInfoCard" },
    ]);
  });
});
