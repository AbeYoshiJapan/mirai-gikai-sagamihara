import type { FeatureFlag, FeaturesSection } from "./schema";

/**
 * この版で常に無効にする機能と、その理由。
 *
 * AI チャットと AI インタビューは、AI がその場で作った文章を運営者の確認を経ずに
 * そのまま利用者に表示する。「AI が作ったものは、運営者が確認してから公開する」
 * という掲載方針と両立しないため、設定画面からも有効にできないようにする。
 * 保存値に true が残っていても、読み込み時に false に戻す。
 */
export const LOCKED_OFF_FEATURES: Partial<Record<FeatureFlag, string>> = {
  ai_chat:
    "この版では使えません。AI の回答が運営者の確認を経ずに利用者へ表示されるためです（掲載方針）",
  ai_interview:
    "この版では使えません。AI の質問・要約が運営者の確認を経ずに利用者へ表示されるためです（掲載方針）",
};

/** 常に無効にする機能か */
export function isLockedOffFeature(flag: string): boolean {
  return Object.hasOwn(LOCKED_OFF_FEATURES, flag);
}

/**
 * 常に無効にする機能を false にした features を返す。元のオブジェクトは変えない。
 */
export function enforceLockedFeatures(
  features: FeaturesSection
): FeaturesSection {
  const result = { ...features };
  for (const flag of Object.keys(LOCKED_OFF_FEATURES) as FeatureFlag[]) {
    result[flag] = false;
  }
  return result;
}
