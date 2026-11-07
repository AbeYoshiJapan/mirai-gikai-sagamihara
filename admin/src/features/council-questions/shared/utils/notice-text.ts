/** 通告一覧の文字を扱う小さな道具 */

/** 全角の数字を半角にする（ほかの文字はそのまま） */
export function toHalfWidthDigits(text: string): string {
  return text.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

/** 空白（全角を含む）をすべて取る */
export function squeeze(text: string): string {
  return text.replace(/[\s　]+/gu, "");
}

/** 全角・半角の数字の文字列を整数にする。数字でなければ null */
export function parseJapaneseInt(text: string): number | null {
  const digits = toHalfWidthDigits(squeeze(text));
  if (!/^\d+$/.test(digits)) return null;
  return Number.parseInt(digits, 10);
}

/** 令和の年を西暦にする（令和元年 = 2019） */
export function reiwaToYear(reiwa: number): number {
  return reiwa + 2018;
}

/** 「令和８年９月２４日」を YYYY-MM-DD にする。読めなければ null */
export function parseWarekiDate(text: string): string | null {
  const match = /令和(元|\d+)年(\d+)月(\d+)日/.exec(
    toHalfWidthDigits(squeeze(text))
  );
  if (!match) return null;
  const year = reiwaToYear(match[1] === "元" ? 1 : Number(match[1]));
  return toDateKey(year, Number(match[2]), Number(match[3]));
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 定例会議を表す鍵（例: 2026-09）と名前（例: 令和8年9月定例会議） */
export function meetingKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function meetingNameOf(year: number, month: number): string {
  return `令和${year - 2018}年${month}月定例会議`;
}

/** 鍵（2026-09）を年と月に戻す。形が違えば null */
export function parseMeetingKey(
  key: string
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

/**
 * 「令和８年定例会９月定例会議」「令和８年９月定例会議」から年と月を読む。
 * 3 月定例会議は前の年の定例会に属すが、会議の名前の年（令和○年）をそのまま使う。
 */
export function parseMeetingLabel(
  text: string
): { year: number; month: number } | null {
  const match = /令和(元|\d+)年(?:定例会)?(\d+)月定例会議/.exec(
    toHalfWidthDigits(squeeze(text))
  );
  if (!match) return null;
  return {
    year: reiwaToYear(match[1] === "元" ? 1 : Number(match[1])),
    month: Number(match[2]),
  };
}

/** 文言に出てくる議案などの番号（公開サイトと同じ読み方にするため、共通の関数を使う） */
export { extractBillRefs } from "@mirai-gikai/shared/council-questions/types";
