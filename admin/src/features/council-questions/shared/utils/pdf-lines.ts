import { getDocumentProxy, getResolvedPDFJS } from "unpdf";
import type { PdfLine } from "../types";

/**
 * PDF の「見えている」文字だけを、行ごとに取り出す。
 *
 * 議会の通告一覧（Excel から書き出した PDF）には、セルの外にはみ出して切り取られ、
 * 画面には出ない古い文字が重なって入っていることがある。普通の文字抽出ではそれも拾うため、
 * 描画の命令を順に追い、切り取り範囲（クリップ）の外にある文字は捨てる。
 */

type Matrix = [number, number, number, number, number, number];
type Box = [number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function transformBox(box: Box, m: Matrix): Box {
  const points = [
    apply(m, box[0], box[1]),
    apply(m, box[2], box[1]),
    apply(m, box[0], box[3]),
    apply(m, box[2], box[3]),
  ];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function intersect(a: Box, b: Box): Box {
  return [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.min(a[2], b[2]),
    Math.min(a[3], b[3]),
  ];
}

function toMatrix(value: unknown): Matrix {
  const numbers = Array.from(value as ArrayLike<number>);
  return numbers.length >= 6 ? (numbers.slice(0, 6) as Matrix) : [...IDENTITY];
}

type Glyph = { x: number; x1: number; y: number; size: number; ch: string };

type PdfGlyph = {
  unicode?: string;
  width?: number;
  isSpace?: boolean;
} | null;

async function extractPageGlyphs(
  page: {
    getOperatorList: () => Promise<{
      fnArray: number[];
      argsArray: unknown[][];
    }>;
  },
  OPS: Record<string, number>
): Promise<Glyph[]> {
  const { fnArray, argsArray } = await page.getOperatorList();
  const glyphs: Glyph[] = [];
  let ctm: Matrix = IDENTITY;
  let clip: Box | null = null;
  const stack: { ctm: Matrix; clip: Box | null }[] = [];
  let pendingClip = false;
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let fontSize = 10;
  let charSpacing = 0;
  let wordSpacing = 0;
  let hScale = 1;
  let leading = 0;
  let rise = 0;

  const moveLine = (tx: number, ty: number) => {
    tlm = multiply([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };

  const show = (items: unknown) => {
    for (const item of Array.from((items ?? []) as ArrayLike<unknown>)) {
      if (typeof item === "number") {
        const tx = (-item / 1000) * fontSize * hScale;
        tm = multiply([1, 0, 0, 1, tx, 0], tm);
        continue;
      }
      const glyph = item as PdfGlyph;
      if (!glyph) continue;
      const width = ((glyph.width ?? 0) / 1000) * fontSize;
      const advance =
        (width + charSpacing + (glyph.isSpace ? wordSpacing : 0)) * hScale;
      const m = multiply(tm, ctm);
      const [x0, y0] = apply(m, 0, rise);
      const [x1] = apply(m, advance, rise);
      const size = Math.abs(fontSize * Math.hypot(m[2], m[3])) || fontSize;
      // 字の中ほどがクリップの中にあれば見えているとみなす
      const cx = (x0 + x1) / 2;
      const cy = y0 + size * 0.35;
      const visible =
        !clip ||
        (cx >= clip[0] - 0.5 &&
          cx <= clip[2] + 0.5 &&
          cy >= clip[1] - 0.5 &&
          cy <= clip[3] + 0.5);
      if (visible) {
        glyphs.push({ x: x0, x1, y: y0, size, ch: glyph.unicode ?? "" });
      }
      tm = multiply([1, 0, 0, 1, advance, 0], tm);
    }
  };

  for (let i = 0; i < fnArray.length; i++) {
    const args = argsArray[i] ?? [];
    switch (fnArray[i]) {
      case OPS.save:
        stack.push({ ctm, clip });
        break;
      case OPS.restore: {
        const previous = stack.pop();
        ctm = previous?.ctm ?? IDENTITY;
        clip = previous?.clip ?? null;
        break;
      }
      case OPS.transform:
        ctm = multiply(toMatrix(args), ctm);
        break;
      case OPS.clip:
      case OPS.eoClip:
        pendingClip = true;
        break;
      case OPS.constructPath: {
        if (pendingClip) {
          const minMax = Array.from(
            (args[2] ?? []) as ArrayLike<number>
          ) as Box;
          if (minMax.length === 4) {
            const box = transformBox(minMax, ctm);
            clip = clip ? intersect(clip, box) : box;
          }
          pendingClip = false;
        }
        break;
      }
      case OPS.endPath:
        pendingClip = false;
        break;
      case OPS.beginText:
        tm = IDENTITY;
        tlm = IDENTITY;
        break;
      case OPS.setFont:
        fontSize = Number(args[1]) || fontSize;
        break;
      case OPS.setTextMatrix:
        tm = toMatrix(args[0] ?? args);
        tlm = tm;
        break;
      case OPS.moveText:
        moveLine(Number(args[0]), Number(args[1]));
        break;
      case OPS.setLeadingMoveText:
        leading = -Number(args[1]);
        moveLine(Number(args[0]), Number(args[1]));
        break;
      case OPS.nextLine:
        moveLine(0, -leading);
        break;
      case OPS.setLeading:
        leading = Number(args[0]);
        break;
      case OPS.setCharSpacing:
        charSpacing = Number(args[0]);
        break;
      case OPS.setWordSpacing:
        wordSpacing = Number(args[0]);
        break;
      case OPS.setHScale:
        hScale = Number(args[0]) / 100;
        break;
      case OPS.setTextRise:
        rise = Number(args[0]);
        break;
      case OPS.showText:
      case OPS.showSpacedText:
        show(args[0]);
        break;
      case OPS.nextLineShowText:
        moveLine(0, -leading);
        show(args[0]);
        break;
      case OPS.nextLineSetSpacingShowText:
        wordSpacing = Number(args[0]);
        charSpacing = Number(args[1]);
        moveLine(0, -leading);
        show(args[2]);
        break;
      default:
        break;
    }
  }
  return glyphs;
}

/** 同じ高さの文字を 1 行にし、左から並べる。間が空いたところで runs を分ける */
export function glyphsToLines(page: number, glyphs: Glyph[]): PdfLine[] {
  const sorted = [...glyphs].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; glyphs: Glyph[] }[] = [];
  for (const glyph of sorted) {
    const tolerance = Math.max(2, glyph.size * 0.3);
    const row = rows.find((r) => Math.abs(r.y - glyph.y) <= tolerance);
    if (row) row.glyphs.push(glyph);
    else rows.push({ y: glyph.y, glyphs: [glyph] });
  }

  const lines: PdfLine[] = [];
  for (const row of rows) {
    row.glyphs.sort((a, b) => a.x - b.x);
    const runs: { x: number; x1: number; text: string }[] = [];
    for (const glyph of row.glyphs) {
      const last = runs[runs.length - 1];
      if (last && glyph.x - last.x1 < glyph.size * 0.6) {
        last.text += glyph.ch;
        last.x1 = glyph.x1;
      } else {
        runs.push({ x: glyph.x, x1: glyph.x1, text: glyph.ch });
      }
    }
    const cleaned = runs
      .map((run) => ({ x: run.x, text: run.text.trim() }))
      .filter((run) => run.text !== "");
    if (cleaned.length === 0) continue;
    lines.push({
      page,
      y: row.y,
      runs: cleaned,
      text: cleaned.map((run) => run.text).join(" "),
    });
  }
  return lines;
}

/** PDF のすべてのページから、見えている文字の行を上から順に取り出す */
export async function extractPdfLines(bytes: Uint8Array): Promise<PdfLine[]> {
  const pdfjs = await getResolvedPDFJS();
  const OPS = pdfjs.OPS as unknown as Record<string, number>;
  // pdfjs は渡したバッファを手放すことがあるので写しを渡す
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const lines: PdfLine[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const glyphs = await extractPageGlyphs(
        page as unknown as Parameters<typeof extractPageGlyphs>[0],
        OPS
      );
      lines.push(...glyphsToLines(pageNumber, glyphs));
    }
  } finally {
    await pdf.cleanup?.();
  }
  return lines;
}
