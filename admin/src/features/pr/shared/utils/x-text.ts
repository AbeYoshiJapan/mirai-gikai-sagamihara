/**
 * X（Twitter）の文字数の数え方。
 * 日本語などは 1 文字を 2、英数字などは 1 と数え、合計 280 まで。URL は長さにかかわらず 23。
 * （twitter-text の重みづけと同じ範囲。絵文字のつなぎ文字などは少し多めに数えることがある）
 */
export const X_MAX_WEIGHT = 280;
export const X_URL_WEIGHT = 23;

const URL_RE = /https?:\/\/[^\s]+/g;

/** 重み 1 で数える文字の範囲（それ以外は 2） */
const LIGHT_RANGES: readonly [number, number][] = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

function charWeight(codePoint: number): number {
  return LIGHT_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to)
    ? 1
    : 2;
}

function weighChars(text: string): number {
  let weight = 0;
  for (const char of text) weight += charWeight(char.codePointAt(0) ?? 0);
  return weight;
}

/** X での文字数（重みの合計） */
export function countXWeight(text: string): number {
  let weight = 0;
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    weight += weighChars(text.slice(last, index)) + X_URL_WEIGHT;
    last = index + match[0].length;
  }
  return weight + weighChars(text.slice(last));
}

/** 重みが maxWeight に収まるように後ろを切り、「…」を付ける（URL を含まない文に使う） */
export function truncateToXWeight(text: string, maxWeight: number): string {
  if (countXWeight(text) <= maxWeight) return text;
  const ellipsis = "…";
  const budget = maxWeight - weighChars(ellipsis);
  if (budget <= 0) return "";
  let weight = 0;
  let result = "";
  for (const char of text) {
    const next = weight + charWeight(char.codePointAt(0) ?? 0);
    if (next > budget) break;
    weight = next;
    result += char;
  }
  return `${result.trimEnd()}${ellipsis}`;
}

/** X の投稿画面を、本文を入れた状態で開く URL（投稿は運営者が自分で行う） */
export function buildXIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
