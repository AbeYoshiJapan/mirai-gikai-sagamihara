/**
 * ヘッダーのサイト名の文字サイズ。長い名前ほど小さくして、スマホ幅でもなるべく 1 行に収める。
 * それでも収まらないときは「＠」の手前（<wbr>）で 2 行に折り返す（ヘッダーは高さ 64px）。
 * 文字数は書記素で数える（絵文字や結合文字でずれないように）。
 */
export function siteNameSizeClass(name: string): string {
  const length = [...name].length;
  if (length <= 10) return "text-[15px] tracking-wider sm:text-[17px]";
  if (length <= 13) return "text-[14px] tracking-wide sm:text-[16px]";
  if (length <= 16) return "text-[13px] sm:text-[15px]";
  return "text-[12px] sm:text-[14px]";
}
