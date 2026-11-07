import type { ParsedQuestionOrder, PdfLine } from "../types";
import {
  parseMeetingLabel,
  squeeze,
  toDateKey,
  toHalfWidthDigits,
} from "./notice-text";

/**
 * 一般質問順位の PDF を読む。順位・議席番号・氏名・会派・質問方式と、予定日。
 *
 * 予定日は表の右の列に、その日の質問者の行をまとめた（縦に結合した）セルの真ん中に書かれる。
 * そのため、日付の高さが「その日の最初の行と最後の行の真ん中」になるように行を区切る。
 */

const DATE_RE = /^(\d+)月(\d+)日[（(].[）)]$/;
const ROW_RE =
  /^(\d+)番(.+?)議員[（(]([^（）()]+)[）)](?:[（(]([^（）()]+)[）)])?$/;

type Row = ParsedQuestionOrder["rows"][number] & { y: number };

export function parseQuestionOrder(lines: PdfLine[]): ParsedQuestionOrder {
  const warnings: string[] = [];
  const titleLine = lines.find((line) =>
    squeeze(line.text).includes("一般質問順位")
  );
  const meeting = titleLine ? parseMeetingLabel(titleLine.text) : null;

  const rows: Row[] = [];
  const dates: { y: number; month: number; day: number }[] = [];

  for (const line of lines) {
    const rest: string[] = [];
    for (const run of line.runs) {
      const match = DATE_RE.exec(toHalfWidthDigits(squeeze(run.text)));
      if (match) {
        dates.push({
          y: line.y,
          month: Number(match[1]),
          day: Number(match[2]),
        });
      } else {
        rest.push(run.text);
      }
    }
    const order = /^\d+$/.test(toHalfWidthDigits(squeeze(rest[0] ?? "")))
      ? Number(toHalfWidthDigits(squeeze(rest[0])))
      : null;
    if (order === null || rest.length < 2) continue;
    const match = ROW_RE.exec(
      toHalfWidthDigits(squeeze(rest.slice(1).join("")))
    );
    if (!match) continue;
    rows.push({
      y: line.y,
      order,
      seatNumber: Number(match[1]),
      memberName: match[2],
      factionLabel: match[3],
      method: match[4] ?? null,
      date: null,
    });
  }

  rows.sort((a, b) => b.y - a.y);
  dates.sort((a, b) => b.y - a.y);

  if (meeting && dates.length > 0 && rows.length > 0) {
    let start = 0;
    dates.forEach((date, index) => {
      if (start >= rows.length) return;
      const isLast = index === dates.length - 1;
      // あとの日付にも少なくとも 1 行ずつ残す
      const maxEnd = isLast
        ? rows.length - 1
        : rows.length - 1 - (dates.length - 1 - index);
      let end = isLast ? rows.length - 1 : start;
      if (!isLast) {
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let candidate = start; candidate <= maxEnd; candidate++) {
          const center = (rows[start].y + rows[candidate].y) / 2;
          const diff = Math.abs(center - date.y);
          if (diff < bestDiff) {
            bestDiff = diff;
            end = candidate;
          }
        }
      }
      const key = toDateKey(meeting.year, date.month, date.day);
      for (let i = start; i <= end; i++) rows[i].date = key;
      start = end + 1;
    });
  } else if (rows.length > 0) {
    warnings.push("一般質問順位から予定日を読めませんでした");
  }

  if (rows.length === 0) {
    warnings.push("一般質問順位から質問者を読めませんでした");
  }

  return {
    year: meeting?.year ?? null,
    month: meeting?.month ?? null,
    rows: rows
      .sort((a, b) => a.order - b.order)
      .map(({ y: _y, ...row }) => row),
    warnings,
  };
}
