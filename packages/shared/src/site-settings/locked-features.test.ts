import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "./defaults";
import {
  enforceLockedFeatures,
  isLockedOffFeature,
  LOCKED_OFF_FEATURES,
} from "./locked-features";

describe("enforceLockedFeatures", () => {
  it("AI チャットと AI インタビューは、保存値が true でも false にする", () => {
    const features = {
      ...DEFAULT_SITE_SETTINGS.features,
      ai_chat: true,
      ai_interview: true,
    };
    const result = enforceLockedFeatures(features);
    expect(result.ai_chat).toBe(false);
    expect(result.ai_interview).toBe(false);
  });

  it("ほかの機能の値はそのまま残し、元のオブジェクトは変えない", () => {
    const features = {
      ...DEFAULT_SITE_SETTINGS.features,
      ai_chat: true,
      topic_analysis: true,
      petitions: false,
    };
    const result = enforceLockedFeatures(features);
    expect(result.topic_analysis).toBe(true);
    expect(result.petitions).toBe(false);
    expect(features.ai_chat).toBe(true);
  });
});

describe("isLockedOffFeature", () => {
  it("常に無効にする機能だけ true", () => {
    expect(isLockedOffFeature("ai_chat")).toBe(true);
    expect(isLockedOffFeature("ai_interview")).toBe(true);
    expect(isLockedOffFeature("topic_analysis")).toBe(false);
    expect(isLockedOffFeature("opinion_form")).toBe(false);
  });

  it("理由の文言がある（設定画面にそのまま出す）", () => {
    for (const reason of Object.values(LOCKED_OFF_FEATURES)) {
      expect(reason).toContain("掲載方針");
    }
  });
});
