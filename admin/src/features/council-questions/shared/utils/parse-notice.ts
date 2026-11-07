import type {
  NoticeItem,
  NoticeQuestion,
  ParsedNoticeList,
  PdfLine,
} from "../types";
import {
  parseJapaneseInt,
  parseWarekiDate,
  squeeze,
  toHalfWidthDigits,
} from "./notice-text";

/**
 * 通告一覧（一般質問通告一覧、代表質問・個人質疑通告一覧）の PDF の行を、
 * 質問者ごとの「項目 → 細目 → ア → （ア） → ａ → （ａ）」に分ける。文言は言い換えない（折り返しだけつなぐ）。
 */

const HEADER_RE =
  /^順位(\d+)質問者(\d+)番(.+?)（([^（）]+)）(?:（([^（）]+)）)?$/;

type ItemHead = { label: string; level: NoticeItem["level"]; text: string };

const KATAKANA = "ア-ン";
/** （ア）の下の段の番号（ａ、ｂ…。半角で書かれていても読む） */
const LETTER = "ａ-ｚa-z";

/** 行の頭の番号を読む。番号だけの run と、番号と文言がつながった run の両方に対応する */
export function parseItemHead(line: PdfLine): ItemHead | null {
  const runs = line.runs.map((run) => run.text);
  const first = runs[0] ?? "";
  const rest = runs.slice(1).join("");
  // 文言の数字は書き換えない（番号だけ半角にそろえる）
  const number = (digits: string) => toHalfWidthDigits(digits);

  // 1　項目（番号と文言のあいだに空白）
  const level1 = /^([0-9０-９]+)[\s　]+(.+)$/u.exec(first);
  if (level1) {
    return {
      label: number(level1[1]),
      level: 1,
      text: joinText(level1[2], rest),
    };
  }
  if (/^[0-9０-９]+$/.test(first) && rest) {
    return { label: number(first), level: 1, text: rest };
  }

  // (1)　細目
  const level2 = /^[(（]([0-9０-９]+)[)）][\s　]*(.*)$/u.exec(first);
  if (level2 && (level2[2] || rest)) {
    return {
      label: `(${number(level2[1])})`,
      level: 2,
      text: joinText(level2[2], rest),
    };
  }

  // （ア）
  const level4 = new RegExp(
    `^[(（]([${KATAKANA}])[)）][\\s\\u3000]*(.*)$`,
    "u"
  ).exec(first);
  if (level4 && (level4[2] || rest)) {
    return {
      label: `（${level4[1]}）`,
      level: 4,
      text: joinText(level4[2], rest),
    };
  }

  // （ａ）
  const level6 = new RegExp(
    `^[(（]([${LETTER}])[)）][\\s\\u3000]*(.*)$`,
    "u"
  ).exec(first);
  if (level6 && (level6[2] || rest)) {
    return {
      label: `（${level6[1]}）`,
      level: 6,
      text: joinText(level6[2], rest),
    };
  }

  // ａ　（英小文字 1 字のあとに空白と文言。空白が無いもの（例: ｅスポーツ）は文言の続き）
  const level5 = new RegExp(`^([${LETTER}])(?:[\\s\\u3000]+(.+))?$`, "u").exec(
    first
  );
  if (level5 && (level5[2] || rest)) {
    return {
      label: level5[1],
      level: 5,
      text: joinText(level5[2] ?? "", rest),
    };
  }

  // ア　（カタカナ 1 字だけの run、または 1 字と空白のあとに文言）
  const level3 = new RegExp(
    `^([${KATAKANA}])(?:[\\s\\u3000]+(.+))?$`,
    "u"
  ).exec(first);
  if (level3 && (level3[2] || rest)) {
    return {
      label: level3[1],
      level: 3,
      text: joinText(level3[2] ?? "", rest),
    };
  }
  return null;
}

function joinText(head: string, rest: string): string {
  return `${head}${rest}`.trim();
}

/** ページ番号だけの行（中ほどに数字だけ） */
function isPageNumber(line: PdfLine): boolean {
  return (
    line.runs.length === 1 &&
    /^\d+$/.test(toHalfWidthDigits(squeeze(line.runs[0].text))) &&
    line.runs[0].x > 150
  );
}

function parseHeader(line: PdfLine): Omit<NoticeQuestion, "items"> | null {
  const match = HEADER_RE.exec(toHalfWidthDigits(squeeze(line.text)));
  if (!match) return null;
  return {
    order: Number(match[1]),
    seatNumber: Number(match[2]),
    memberName: match[3],
    factionLabel: match[4],
    method: match[5] ?? null,
  };
}

export function parseNoticeList(lines: PdfLine[]): ParsedNoticeList {
  const warnings: string[] = [];
  const title = squeeze(
    lines.find((line) => squeeze(line.text).includes("通告一覧"))?.text ?? ""
  );
  const listKind: ParsedNoticeList["listKind"] =
    title.includes("代表質問") || title.includes("個人質疑")
      ? "representative"
      : "general";

  let noticeDate: string | null = null;
  const questions: NoticeQuestion[] = [];
  let current: NoticeQuestion | null = null;
  let stack: NoticeItem[] = [];
  let last: NoticeItem | null = null;

  for (const line of lines) {
    const text = squeeze(line.text);
    if (/^[(（]注/.test(text)) break; // 末尾の注記から後は項目ではない
    if (isPageNumber(line)) continue;

    const header = parseHeader(line);
    if (header) {
      current = { ...header, items: [] };
      questions.push(current);
      stack = [];
      last = null;
      continue;
    }
    if (!current) {
      noticeDate ??= parseWarekiDate(text);
      continue;
    }

    const head = parseItemHead(line);
    if (head) {
      const item: NoticeItem = { ...head, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(item);
      } else {
        if (item.level !== 1) {
          warnings.push(
            `順位${current.order}（${current.memberName}）：「${item.label}」の上の項目が見つかりません`
          );
        }
        current.items.push(item);
      }
      stack.push(item);
      last = item;
      continue;
    }

    if (last) {
      // 折り返しの続き（文言の途中で改行されている）
      last.text += line.runs.map((run) => run.text).join("");
      continue;
    }
    warnings.push(
      `順位${current.order}（${current.memberName}）：読めなかった行「${line.text}」`
    );
  }

  if (questions.length === 0) {
    warnings.push(
      "質問者が 1 人も見つかりませんでした（通告一覧の PDF か確かめてください）"
    );
  }
  for (const question of questions) {
    if (question.items.length === 0) {
      warnings.push(
        `順位${question.order}（${question.memberName}）：項目がありません`
      );
    }
  }
  return { listKind, noticeDate, questions, warnings };
}

/** 項目の木を、上から順に平らにする（表示・比較用） */
export function flattenItems(items: NoticeItem[]): NoticeItem[] {
  const flat: NoticeItem[] = [];
  const walk = (list: NoticeItem[]) => {
    for (const item of list) {
      flat.push(item);
      walk(item.children);
    }
  };
  walk(items);
  return flat;
}

/** 番号から数を読む（項目のテーマのひも付けに使う。例: "1" → 1） */
export function itemNumber(item: NoticeItem): number | null {
  return item.level === 1 ? parseJapaneseInt(item.label) : null;
}
