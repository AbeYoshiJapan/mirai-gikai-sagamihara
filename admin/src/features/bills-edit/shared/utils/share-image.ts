import { BILL_THUMBNAILS_BUCKET } from "../constants";

export const SHARE_IMAGE_WIDTH = 1800;
export const SHARE_IMAGE_HEIGHT = 945;

export const SHARE_IMAGE_TITLE_MAX_LENGTH = 60;
export const SHARE_IMAGE_TITLE_MAX_LINES = 3;
export const SHARE_IMAGE_TITLE_FONT_SIZE = 105;
export const SHARE_IMAGE_TITLE_LINE_HEIGHT = 150;
/** 長いタイトルは、この順に文字を小さくして 3 行に収める */
export const SHARE_IMAGE_TITLE_FONT_SIZES = [105, 100, 95, 90, 85, 80] as const;
export const SHARE_IMAGE_TITLE_LETTER_SPACING_EM = 0.03;
export const SHARE_IMAGE_TITLE_LEFT = 136;
export const SHARE_IMAGE_TITLE_OFFSET_Y = -7;
export const SHARE_IMAGE_TITLE_MAX_WIDTH = 1560;

const HALF_WIDTH_RATIO = 0.65;

export function splitShareImageTitle(title: string): string[] {
  return title
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** 1 文字の幅（フォントサイズ何文字分か）。全角1・半角0.65に字間を足す */
function charWidthInEm(char: string): number {
  const glyph = /[\u0020-\u007e\uff61-\uff9f]/.test(char)
    ? HALF_WIDTH_RATIO
    : 1;
  return glyph + SHARE_IMAGE_TITLE_LETTER_SPACING_EM;
}

/** 全角1・半角0.65に字間を足して、フォントサイズ何文字分の幅になるかを安全側に見積もる */
export function estimateLineWidthInEm(line: string): number {
  let width = 0;
  for (const char of line) width += charWidthInEm(char);
  return width;
}

const HIRAGANA = /[\u3041-\u309f]/;
/** この文字の後ろで区切ってよい（句読点・閉じかっこ・空白） */
const BREAK_AFTER = /[、。，．,.!！?？）)」』】〕〉》・：:；;\s]/;
/** この文字の前で区切ってよい（開きかっこ） */
const BREAK_BEFORE = /[（(「『【〔〈《]/;
/** 行の頭に来てはいけない文字（禁則） */
const NO_LINE_START =
  /[、。，．,.!！?？）)」』】〕〉》・：:；;ーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々]/;

/** 議案名によく出る、前で区切ってよい言葉（漢字が続く長い名前を自然に折り返すため） */
const BREAK_BEFORE_WORDS = [
  "特別会計",
  "歳入歳出",
  "事業",
  "決算",
  "補正予算",
  "予算",
  "条例",
  "について",
  "に関する",
  "に対する",
  "に係る",
];
/** 後ろで区切ってよい言葉 */
const BREAK_AFTER_WORDS = ["年度"];
/** この長さ以下のかっこの中は区切らない（「(ひばり放送)」のような名前を割らない） */
const SHORT_BRACKET_LENGTH = 10;
const OPEN_TO_CLOSE: Record<string, string> = {
  "（": "）",
  "(": ")",
  "「": "」",
  "『": "』",
  "【": "】",
  "〔": "〕",
  "〈": "〉",
  "《": "》",
};

function indexesOf(text: string, word: string): number[] {
  const found: number[] = [];
  let from = text.indexOf(word);
  while (from !== -1) {
    found.push(from);
    from = text.indexOf(word, from + 1);
  }
  return found;
}

/** 短いかっこの中の位置（区切らない） */
function insideShortBrackets(chars: string[]): Set<number> {
  const inside = new Set<number>();
  for (let open = 0; open < chars.length; open++) {
    const close = OPEN_TO_CLOSE[chars[open]];
    if (!close) continue;
    const end = chars.indexOf(close, open + 1);
    if (end === -1 || end - open - 1 > SHORT_BRACKET_LENGTH) continue;
    for (let i = open + 1; i <= end; i++) inside.add(i);
  }
  return inside;
}

/**
 * 改行してよい位置（その位置の文字の前で区切れる）。
 * 句読点・かっこのほか、ひらがなの後に漢字やカタカナが続くところ（「〜に｜対する」「〜を｜求める」）と、
 * 議案名によく出る言葉の前後（「〜整理｜事業｜特別会計」）を切れ目とみなす。
 */
export function findTitleBreakOpportunities(chars: string[]): Set<number> {
  const breaks = new Set<number>();
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1];
    const cur = chars[i];
    if (
      BREAK_AFTER.test(prev) ||
      BREAK_BEFORE.test(cur) ||
      (HIRAGANA.test(prev) && !HIRAGANA.test(cur))
    ) {
      breaks.add(i);
    }
  }
  // 文字列の位置で探すので、サロゲートペアを含まない議案名を前提にした補助
  const text = chars.join("");
  if (text.length === chars.length) {
    for (const word of BREAK_BEFORE_WORDS) {
      for (const i of indexesOf(text, word)) breaks.add(i);
    }
    for (const word of BREAK_AFTER_WORDS) {
      for (const i of indexesOf(text, word)) breaks.add(i + word.length);
    }
  }
  const inside = insideShortBrackets(chars);
  for (const i of [...breaks]) {
    if (
      i <= 0 ||
      i >= chars.length ||
      NO_LINE_START.test(chars[i]) ||
      inside.has(i)
    ) {
      breaks.delete(i);
    }
  }
  return breaks;
}

/** 1 行を増やす重み（行は少ないほどよい） */
const LINE_COST = 1000;
/** 文字の途中で区切る重み */
const HARD_BREAK_COST = 100_000;
/** 最後の行がこの文字数以下だと、取り残された感じになる */
const ORPHAN_CHARS = 4;
const ORPHAN_COST = 10_000;

/**
 * 1 行を幅 maxEm に収まるよう折り返す。
 * 行数が少なく、各行の長さがそろい、文のまとまりの切れ目で区切れる割り付けを選ぶ
 * （最後の行に数文字だけ残る割り付けは避ける）。切れ目で区切れないとき（長い漢字の並びなど）だけ
 * 文字の途中で区切り、その数を hardBreaks に数える。
 */
export function wrapTitleLine(
  line: string,
  maxEm: number
): { lines: string[]; hardBreaks: number; orphans: number } {
  const chars = [...line.trim()];
  const n = chars.length;
  if (n === 0) return { lines: [], hardBreaks: 0, orphans: 0 };
  const natural = findTitleBreakOpportunities(chars);
  const prefix = [0];
  for (const char of chars)
    prefix.push(prefix[prefix.length - 1] + charWidthInEm(char));

  const solve = (strict: boolean) => {
    const best = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY);
    const from = new Array<number>(n + 1).fill(-1);
    best[0] = 0;
    for (let j = 1; j <= n; j++) {
      // 次の行の頭に来てはいけない文字の前では区切らない
      if (strict && j < n && NO_LINE_START.test(chars[j])) continue;
      for (let i = j - 1; i >= 0; i--) {
        const width = prefix[j] - prefix[i];
        if (width > maxEm && j - i > 1) break;
        if (!Number.isFinite(best[i])) continue;
        let cost = best[i] + LINE_COST;
        if (j < n) cost += (maxEm - width) ** 2;
        if (i > 0 && !natural.has(i)) cost += HARD_BREAK_COST;
        if (j === n && i > 0 && j - i <= ORPHAN_CHARS) cost += ORPHAN_COST;
        if (cost < best[j]) {
          best[j] = cost;
          from[j] = i;
        }
      }
    }
    return Number.isFinite(best[n]) ? from : null;
  };

  const from = solve(true) ?? solve(false);
  const cuts: number[] = [];
  for (let j = n; j > 0 && from; j = from[j]) cuts.unshift(j);
  const lines: string[] = [];
  let hardBreaks = 0;
  let start = 0;
  for (const cut of cuts) {
    if (start > 0 && !natural.has(start)) hardBreaks++;
    lines.push(chars.slice(start, cut).join("").trim());
    start = cut;
  }
  const last = lines[lines.length - 1] ?? "";
  const orphans = lines.length > 1 && [...last].length <= ORPHAN_CHARS ? 1 : 0;
  return { lines: lines.filter((l) => l.length > 0), hardBreaks, orphans };
}

export type ShareImageTitleLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
};

export type ShareImageTitleValidation =
  | ({ ok: true } & ShareImageTitleLayout)
  | { ok: false; error: string };

/**
 * タイトルを画像の 3 行に割り付ける。
 * 入れた改行はそのまま使い、幅に収まらない行は文のまとまりの切れ目で自動で折り返す。
 * 3 行に収まらなければ文字を少しずつ小さくする（切れ目で折り返せる大きさを優先）。
 */
export function validateShareImageTitle(
  title: string
): ShareImageTitleValidation {
  const manualLines = splitShareImageTitle(title);
  if (manualLines.length === 0) {
    return { ok: false, error: "タイトルを入力してください" };
  }
  if (manualLines.length > SHARE_IMAGE_TITLE_MAX_LINES) {
    return {
      ok: false,
      error: `タイトルは${SHARE_IMAGE_TITLE_MAX_LINES}行以内にしてください`,
    };
  }
  const length = manualLines.reduce((sum, line) => sum + [...line].length, 0);
  if (length > SHARE_IMAGE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `タイトルは改行を除いて${SHARE_IMAGE_TITLE_MAX_LENGTH}文字以内にしてください`,
    };
  }

  const candidates = SHARE_IMAGE_TITLE_FONT_SIZES.map((fontSize) => {
    const maxEm = SHARE_IMAGE_TITLE_MAX_WIDTH / fontSize;
    let hardBreaks = 0;
    let orphans = 0;
    const lines = manualLines.flatMap((manual) => {
      const wrapped = wrapTitleLine(manual, maxEm);
      hardBreaks += wrapped.hardBreaks;
      orphans += wrapped.orphans;
      return wrapped.lines;
    });
    return { fontSize, lines, hardBreaks, orphans };
  }).filter((c) => c.lines.length <= SHARE_IMAGE_TITLE_MAX_LINES);

  // 大きい文字から順に、切れ目で区切れて取り残しのない割り付けを選ぶ
  const best =
    candidates.find((c) => c.hardBreaks === 0 && c.orphans === 0) ??
    candidates.find((c) => c.hardBreaks === 0) ??
    candidates[0] ??
    null;
  if (!best) {
    return {
      ok: false,
      error: `長すぎて${SHARE_IMAGE_TITLE_MAX_LINES}行に収まりません。改行の位置を変えるか、言い換えて短くしてください`,
    };
  }
  return {
    ok: true,
    lines: best.lines,
    fontSize: best.fontSize,
    lineHeight: Math.round(
      (best.fontSize * SHARE_IMAGE_TITLE_LINE_HEIGHT) /
        SHARE_IMAGE_TITLE_FONT_SIZE
    ),
  };
}

/** 自動で割り付けた行を、改行入りの文字にする（入力欄に入れて手直しできるように） */
export function autoBreakShareImageTitle(title: string): string {
  const joined = splitShareImageTitle(title).join("");
  const layout = validateShareImageTitle(joined);
  return layout.ok ? layout.lines.join("\n") : joined;
}

/**
 * シェア画像の背景写真としてアップロードしたファイル（share-src_<議案ID>_<時刻>.<拡張子>）のうち、
 * いちばん新しいものの名前。作り直すときに写真を選び直さなくて済むようにする。
 */
export function pickLatestShareSourceName(
  names: string[],
  billId: string
): string | null {
  const pattern = new RegExp(
    `^share-src_${billId.replace(/[^0-9a-f-]/gi, "")}_(\\d+)\\.(jpe?g|png)$`,
    "i"
  );
  let latest: { name: string; time: number } | null = null;
  for (const name of names) {
    const time = Number(pattern.exec(name)?.[1]);
    if (!Number.isFinite(time) || time <= 0) continue;
    if (!latest || time > latest.time) latest = { name, time };
  }
  return latest?.name ?? null;
}

/** SSRF 対策として、自前の Supabase Storage の bill-thumbnails 公開 URL だけを許可する */
export function isAllowedSharePhotoUrl(
  photoUrl: string,
  supabaseUrl: string
): boolean {
  let photo: URL;
  let supabase: URL;
  try {
    photo = new URL(photoUrl);
    supabase = new URL(supabaseUrl);
  } catch {
    return false;
  }
  if (photo.origin !== supabase.origin) return false;
  if (photo.username || photo.password) return false;
  const prefix = `/storage/v1/object/public/${BILL_THUMBNAILS_BUCKET}/`;
  if (!photo.pathname.startsWith(prefix)) return false;
  const fileName = photo.pathname.slice(prefix.length);
  return /^[A-Za-z0-9._-]+$/.test(fileName) && !fileName.includes("..");
}

export function buildShareImagePreviewPath(params: {
  title: string;
  photoUrl?: string | null;
}): string {
  const search = new URLSearchParams({ title: params.title });
  if (params.photoUrl) search.set("photoUrl", params.photoUrl);
  return `/api/bill-share-image?${search.toString()}`;
}

export type ShareImageInput =
  | ({ ok: true; photoUrl: string | null } & ShareImageTitleLayout)
  | { ok: false; error: string };

export function parseShareImageInput(params: {
  title: string | null;
  photoUrl: string | null;
  supabaseUrl: string;
  requirePhoto: boolean;
}): ShareImageInput {
  const titleResult = validateShareImageTitle(params.title ?? "");
  if (!titleResult.ok) return titleResult;
  const { lines, fontSize, lineHeight } = titleResult;
  if (!params.photoUrl) {
    return params.requirePhoto
      ? { ok: false, error: "背景写真をアップロードしてください" }
      : { ok: true, lines, fontSize, lineHeight, photoUrl: null };
  }
  if (!isAllowedSharePhotoUrl(params.photoUrl, params.supabaseUrl)) {
    return { ok: false, error: "背景写真の URL が不正です" };
  }
  return { ok: true, lines, fontSize, lineHeight, photoUrl: params.photoUrl };
}

export function listMissingShareImageAssets(assets: {
  font: ArrayBuffer | null;
  logo: string | null;
}): string[] {
  const missing: string[] = [];
  if (!assets.font) missing.push("font");
  if (!assets.logo) missing.push("logo");
  return missing;
}
