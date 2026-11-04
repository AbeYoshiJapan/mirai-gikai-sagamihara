import {
  BRAND_ASSET_KEYS,
  type BrandAssetKey,
} from "@mirai-gikai/shared/site-settings/brand-presets";

export type BrandPresetFieldPaths = {
  /** preset 項目のパス（そのまま） */
  preset: string;
  /** "brand." や ""。他の項目のパスの前に付ける */
  prefix: string;
  /** colors オブジェクトのパス */
  colors: string;
  /** 画像の項目名（prefix を付けて使う） */
  assetKeys: readonly BrandAssetKey[];
};

/**
 * preset 項目のパスから、同じフォーム内のテーマ色・画像の項目のパスを導く。
 * 設定画面（単体フォーム）では "preset"、ウィザード（全体フォーム）では "brand.preset" になる。
 */
export function brandPresetFieldPaths(
  presetPath: string
): BrandPresetFieldPaths {
  const suffix = "preset";
  if (!presetPath.endsWith(suffix)) {
    throw new Error(`ブランド案の項目パスではありません: ${presetPath}`);
  }
  const prefix = presetPath.slice(0, presetPath.length - suffix.length);
  return {
    preset: presetPath,
    prefix,
    colors: `${prefix}colors`,
    assetKeys: BRAND_ASSET_KEYS,
  };
}
