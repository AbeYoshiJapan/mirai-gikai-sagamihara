import { describe, expect, it } from "vitest";
import { brandPresetFieldPaths } from "./brand-preset-form";

describe("brandPresetFieldPaths", () => {
  it("単体フォーム（前置きなし）", () => {
    const paths = brandPresetFieldPaths("preset");
    expect(paths.prefix).toBe("");
    expect(paths.colors).toBe("colors");
    expect(paths.assetKeys).toContain("logo_url");
  });

  it("全体フォーム（brand. 前置き）", () => {
    const paths = brandPresetFieldPaths("brand.preset");
    expect(paths.prefix).toBe("brand.");
    expect(paths.colors).toBe("brand.colors");
  });

  it("preset 以外のパスは受け付けない", () => {
    expect(() => brandPresetFieldPaths("brand.colors")).toThrow();
  });
});
