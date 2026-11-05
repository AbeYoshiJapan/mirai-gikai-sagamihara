import { describe, expect, it } from "vitest";
import { siteNameSizeClass } from "./site-name-size";

describe("siteNameSizeClass", () => {
  it("短い名前は大きく、長い名前ほど小さくする", () => {
    expect(siteNameSizeClass("みらい議会＠相模原市")).toContain(
      "sm:text-[17px]"
    );
    expect(siteNameSizeClass("さがみはら議会ナビ＠南区")).toContain(
      "sm:text-[16px]"
    );
    expect(siteNameSizeClass("みんなでみる相模原市議会＠南区")).toContain(
      "sm:text-[15px]"
    );
    expect(siteNameSizeClass("市民とつくる相模原市議会ナビ＠南区")).toContain(
      "sm:text-[14px]"
    );
  });
});
