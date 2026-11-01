import { describe, expect, it } from "vitest";
import {
  AUTO_PUBLISH_MAX_MODERATION_SCORE,
  AUTO_PUBLISH_MIN_CONTENT_RICHNESS,
  isPublicReportVisible,
} from "./auto-publish";

describe("一括公開の既定しきい値", () => {
  it("モデレーション警告の一段下、充実度 50 を既定にする", () => {
    expect(AUTO_PUBLISH_MAX_MODERATION_SCORE).toBeLessThan(100);
    expect(AUTO_PUBLISH_MIN_CONTENT_RICHNESS).toBe(50);
  });
});

describe("isPublicReportVisible", () => {
  const baseInput = {
    isPublicByAdmin: true,
    isPublicByUser: true,
  };

  it("両方の公開フラグがあり N 件以上揃っているレポートだけ表示する", () => {
    expect(isPublicReportVisible(baseInput)).toBe(true);
  });

  it.each([
    { isPublicByAdmin: false },
    { isPublicByUser: false },
  ])("公開条件が欠けるレポートを非表示にする", (override) => {
    expect(isPublicReportVisible({ ...baseInput, ...override })).toBe(false);
  });
});
