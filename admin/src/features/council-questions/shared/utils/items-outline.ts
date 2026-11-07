import type { NoticeItem } from "../types";
import { toHalfWidthDigits } from "./notice-text";

/**
 * 項目の木を、管理画面で直せる「1 行 1 項目」の文字にする（字下げは見やすさのためだけ）。
 *
 * 1 ＡＩの活用による行政のＤＸ推進について
 *   (1) 現状について
 *     ア 〜
 *       （ア） 〜
 *         ａ 〜
 *           （ａ） 〜
 */
export function formatItemsOutline(items: NoticeItem[]): string {
  const lines: string[] = [];
  const walk = (list: NoticeItem[]) => {
    for (const item of list) {
      lines.push(`${"  ".repeat(item.level - 1)}${item.label} ${item.text}`);
      walk(item.children);
    }
  };
  walk(items);
  return lines.join("\n");
}

type Head = { label: string; level: NoticeItem["level"]; text: string };

function parseOutlineLine(line: string): Head | null {
  const body = line.replace(/^[\s　]+/u, "");
  const half = toHalfWidthDigits(body);
  const level1 = /^(\d+)[\s　]+(.+)$/u.exec(half);
  if (level1) {
    // 文言は書き換えないよう、元の文字から番号の分だけ取り除く
    return {
      label: level1[1],
      level: 1,
      text: body.replace(/^[0-9０-９]+[\s　]+/u, "").trim(),
    };
  }
  const level2 = /^[(（](\d+)[)）][\s　]*(.+)$/u.exec(half);
  if (level2) {
    return {
      label: `(${level2[1]})`,
      level: 2,
      text: body.replace(/^[(（][0-9０-９]+[)）][\s　]*/u, "").trim(),
    };
  }
  const level4 = /^[(（]([ア-ン])[)）][\s　]*(.+)$/u.exec(body);
  if (level4)
    return { label: `（${level4[1]}）`, level: 4, text: level4[2].trim() };
  const level3 = /^([ア-ン])[\s　]+(.+)$/u.exec(body);
  if (level3) return { label: level3[1], level: 3, text: level3[2].trim() };
  const level6 = /^[(（]([ａ-ｚa-z])[)）][\s　]*(.+)$/u.exec(body);
  if (level6)
    return { label: `（${level6[1]}）`, level: 6, text: level6[2].trim() };
  const level5 = /^([ａ-ｚa-z])[\s　]+(.+)$/u.exec(body);
  if (level5) return { label: level5[1], level: 5, text: level5[2].trim() };
  return null;
}

/** 管理画面で直した文字を、項目の木に戻す。番号が読めない行があれば、その行を知らせる */
export function parseItemsOutline(
  text: string
): { ok: true; items: NoticeItem[] } | { ok: false; error: string } {
  const items: NoticeItem[] = [];
  const stack: NoticeItem[] = [];
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "") continue;
    const head = parseOutlineLine(line);
    if (!head) {
      return {
        ok: false,
        error: `${index + 1} 行目の番号が読めません（「1」「(1)」「ア」「（ア）」「ａ」「（ａ）」のどれかで始めてください）：${line.trim()}`,
      };
    }
    const item: NoticeItem = { ...head, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level)
      stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent && item.level !== 1) {
      return {
        ok: false,
        error: `${index + 1} 行目「${item.label}」の上に「1」などの項目がありません`,
      };
    }
    if (parent) parent.children.push(item);
    else items.push(item);
    stack.push(item);
  }
  if (items.length === 0)
    return { ok: false, error: "項目が 1 つもありません" };
  return { ok: true, items };
}
