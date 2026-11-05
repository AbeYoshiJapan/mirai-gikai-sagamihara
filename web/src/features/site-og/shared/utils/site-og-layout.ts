import {
  BRAND_PRESETS,
  type BrandOgText,
  isBrandPresetId,
} from "@mirai-gikai/shared/site-settings/brand-presets";
import type { BrandSection } from "@mirai-gikai/shared/site-settings/schema";

/**
 * サイトの OGP 画像（/api/og/site）のレイアウト計算。
 * 画像にはサイト名などの文字を焼き込まず、設定の文字をここで配置するので、
 * サイト名を変えても画像を作り直さなくてよい。
 */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** 文字を置ける幅（左右の余白 84px を除く） */
export const OG_TEXT_WIDTH = OG_WIDTH - 84 * 2;

/** 文字数で数える（絵文字や結合文字でずれないように書記素単位） */
function countChars(text: string): number {
  return [...text].length;
}

/**
 * サイト名の文字サイズ。10 文字までは 66px、長いほど小さくして 1 行に収める。
 * 20 文字を超えると 40px でも幅に入らないので、そのときは Satori が折り返す。
 */
export function siteNameFontSize(name: string): number {
  const length = countChars(name);
  if (length <= 10) return 66;
  if (length <= 13) return 56;
  if (length <= 16) return 48;
  return 40;
}

/** 1 行に収まる長さに切り、超えたら「…」を付ける */
export function truncateForOneLine(
  text: string,
  fontSize: number,
  width = OG_TEXT_WIDTH
): string {
  const max = Math.floor(width / fontSize);
  const chars = [...text.trim()];
  if (chars.length <= max) return chars.join("");
  return `${chars.slice(0, Math.max(max - 1, 1)).join("")}…`;
}

/**
 * 文字色。同梱のブランド案なら案ごとの色（ぎんがは白文字）、custom なら濃い文字。
 */
export function ogTextColors(
  brand: Pick<BrandSection, "preset" | "colors">
): BrandOgText {
  if (isBrandPresetId(brand.preset)) {
    return BRAND_PRESETS[brand.preset].og;
  }
  return {
    ink: "#1f2933",
    sub: brand.colors.primary_accent,
    muted: "#5b6670",
  };
}

/** 運営者の注記（公式サイトと取り違えないように） */
export function operatorNote(operatorTitle: string): string {
  const title = operatorTitle.trim() || "運営者";
  return `${title}が個人で運営・公式サイトではありません`;
}
