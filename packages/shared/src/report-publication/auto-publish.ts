import { MODERATION_THRESHOLDS } from "../moderation/moderation";

/** 一括公開ボタンの既定しきい値（モデレーションスコアの上限） */
export const AUTO_PUBLISH_MAX_MODERATION_SCORE =
  MODERATION_THRESHOLDS.WARNING - 1;
/** 一括公開ボタンの既定しきい値（内容の充実度の下限） */
export const AUTO_PUBLISH_MIN_CONTENT_RICHNESS = 50;
/**
 * オープンデータAPIが議案を配布対象に含める下限。
 *
 * かつては公開ページの表示ゲート（k-匿名性）としてサイト全体で使っていたが、
 * 「偏ったインタビューが悪目立ちする」懸念が実際には起きなかったため表示側からは
 * 撤去した。バルクエクスポートは第三者が他データと突き合わせられる経路で、
 * 表示するかどうかとは別の判断なのでこちらには残す。
 */
export const MIN_PUBLIC_REPORTS_FOR_OPEN_DATA = 20;

/**
 * レポートの公開は管理者の操作（個別の公開・しきい値を指定した一括公開）だけで行う。
 * 以前はモデレーションスコアと内容の充実度で自動公開していたが、
 * 「公開前に管理人が確認する」方針により撤去した。上の 2 つのしきい値は
 * 一括公開ボタンの既定値としてだけ使う。
 */

export type PublicReportVisibilityInput = {
  isPublicByAdmin: boolean;
  isPublicByUser: boolean;
};

/**
 * 公開レポートを表示してよいか。
 *
 * 判定は管理者公開とユーザー同意の2つだけ。議案あたりの件数による下限
 * （20件の k-匿名性ゲート）は撤去した。少数回答の議案が悪目立ちする懸念で
 * 入れていたが、運用上そうした事象が起きていないため。
 */
export function isPublicReportVisible({
  isPublicByAdmin,
  isPublicByUser,
}: PublicReportVisibilityInput): boolean {
  return isPublicByAdmin && isPublicByUser;
}
