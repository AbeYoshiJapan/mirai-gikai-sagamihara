/**
 * 議会での質問（代表質問・個人質疑・一般質問）。web と admin の両方で使う型と表記。
 * 議会が公表する通告一覧をもとに仮登録し、運営者が確認して公開する。
 */
export type CouncilQuestionKind = "representative" | "individual" | "general";

export const COUNCIL_QUESTION_KIND_LABELS: Record<CouncilQuestionKind, string> =
  {
    representative: "代表質問",
    individual: "個人質疑",
    general: "一般質問",
  };

/** 並べる順（代表質問 → 個人質疑 → 一般質問） */
export const COUNCIL_QUESTION_KIND_ORDER: CouncilQuestionKind[] = [
  "representative",
  "individual",
  "general",
];

/** 通告の項目。1 → (1) → ア → （ア） → ａ → （ａ） の 6 段まで */
export type NoticeItem = {
  /** 通告一覧の番号（数字は半角に直す）。例: 1、(1)、ア、（ア）、ａ、（ａ） */
  label: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** 通告の文言（折り返しはつなぐ。言い換えない） */
  text: string;
  children: NoticeItem[];
};

/** DB の items（jsonb）を項目の木として読む。形が違うものは捨てる */
export function readNoticeItems(value: unknown): NoticeItem[] {
  if (!Array.isArray(value)) return [];
  const items: NoticeItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const level = Number(item.level);
    if (
      typeof item.label !== "string" ||
      typeof item.text !== "string" ||
      ![1, 2, 3, 4, 5, 6].includes(level)
    ) {
      continue;
    }
    items.push({
      label: item.label,
      level: level as NoticeItem["level"],
      text: item.text,
      children: readNoticeItems(item.children),
    });
  }
  return items;
}

/** 氏名を比べるときは空白（全角を含む）を取る */
export function normalizeMemberName(name: string): string {
  return name.replace(/[\s　]+/gu, "");
}

/**
 * 項目に出てくる番号（例: 議案第99号）を、その定例会議の年の議案番号（例: 令和8年議案第99号）にする。
 * 議案の番号は年ごとに振り直される（3 月定例会議も会議の名前の年）。
 */
export function toBillNumber(ref: string, meetingKey: string): string | null {
  const year = Number(meetingKey.slice(0, 4));
  if (!Number.isFinite(year) || year < 2019) return null;
  return `令和${year - 2018}年${ref}`;
}

/** 全角の数字を半角にし、空白（全角を含む）を取る */
function normalizeRefText(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]+/gu, "");
}

/**
 * 文言に出てくる議案などの番号を拾う（例: 議案第９９号 → 議案第99号）。
 * 「議提議案第8号」は「議案第8号」と別の番号として拾う。
 */
export function extractBillRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const match of normalizeRefText(text).matchAll(
    /(議提議案|議案|陳情|請願)第(\d+)号/g
  )) {
    refs.add(`${match[1]}第${Number(match[2])}号`);
  }
  return [...refs];
}

/**
 * 議案番号（例: 令和8年議案第99号）を、年（2026）と、通告に出てくる形（議案第99号）に分ける。
 * toBillNumber の逆。読めなければ null
 */
export function parseBillNumber(
  billNumber: string
): { year: number; ref: string } | null {
  const match = /^令和(元|\d+)年((?:議提議案|議案|陳情|請願)第(\d+)号)$/.exec(
    normalizeRefText(billNumber)
  );
  if (!match) return null;
  const reiwa = match[1] === "元" ? 1 : Number(match[1]);
  const ref = match[2].replace(/第\d+号$/, `第${Number(match[3])}号`);
  return { year: reiwa + 2018, ref };
}
