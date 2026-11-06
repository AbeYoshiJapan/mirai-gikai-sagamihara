import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./share-image";

// デザイナーの 1800×945 の雛形から実測した値
export const SHARE_IMAGE_FRAME = {
  left: 40,
  top: 51,
  right: 1761,
  bottom: 894,
  strokeWidth: 12,
  radius: 42,
} as const;

export const SHARE_IMAGE_TAB = {
  left: 1443,
  bottom: 147,
  bottomLeftRadius: 40,
} as const;

export const SHARE_IMAGE_LOGO = {
  left: 1492,
  top: 684,
  width: 284,
  height: 241,
} as const;

export const SHARE_IMAGE_TAB_FONT_SIZE = 46;
const TAB_LETTER_SPACING_EM = 0.08;
const TAB_PADDING_X = 40;
/** タブを広げるのはここまで（タイトルの上の帯に収める） */
const TAB_MIN_LEFT = 700;

/**
 * 右上のタブにサイト名を入れるための位置と文字の大きさ。
 * 雛形のタブ幅（本家の「みらい議会」用）に入らない名前は、タブを左へ広げる。
 * それでも入らなければ文字を小さくする。
 */
export function layoutShareImageTab(label: string): {
  left: number;
  fontSize: number;
} {
  const em = [...label].reduce(
    (sum, char) =>
      sum +
      (/[\u0020-\u007e\uff61-\uff9f]/.test(char) ? 0.65 : 1) +
      TAB_LETTER_SPACING_EM,
    0
  );
  const defaultWidth = SHARE_IMAGE_FRAME.right - SHARE_IMAGE_TAB.left;
  const maxWidth = SHARE_IMAGE_FRAME.right - TAB_MIN_LEFT;
  let fontSize = SHARE_IMAGE_TAB_FONT_SIZE;
  let width = Math.max(
    defaultWidth,
    Math.ceil(em * fontSize) + TAB_PADDING_X * 2
  );
  if (width > maxWidth) {
    fontSize = Math.max(20, Math.floor((maxWidth - TAB_PADDING_X * 2) / em));
    width = maxWidth;
  }
  return { left: SHARE_IMAGE_FRAME.right - width, fontSize };
}

const GRADIENT_FROM = "#64D8C6";
const GRADIENT_TO = "#BCECD3";

function gradient(id: string, x1: number, y1: number, x2: number, y2: number) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${GRADIENT_FROM}"/><stop offset="1" stop-color="${GRADIENT_TO}"/></linearGradient>`;
}

/** 枠線と、サイト名を入れるタブの背景を描く SVG。文字は Satori 側で重ねる */
export function buildShareImageFrameSvg(
  tabLeft: number = SHARE_IMAGE_TAB.left
): string {
  const f = SHARE_IMAGE_FRAME;
  const t = { ...SHARE_IMAGE_TAB, left: tabLeft };
  const half = f.strokeWidth / 2;
  const rectRadius = f.radius - half;
  const tabPath = [
    `M${t.left},${f.top}`,
    `H${f.right - f.radius}`,
    `A${f.radius},${f.radius} 0 0 1 ${f.right},${f.top + f.radius}`,
    `V${t.bottom}`,
    `H${t.left + t.bottomLeftRadius}`,
    `A${t.bottomLeftRadius},${t.bottomLeftRadius} 0 0 1 ${t.left},${t.bottom - t.bottomLeftRadius}`,
    "Z",
  ].join(" ");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}">`,
    "<defs>",
    gradient("frame", 309, -177, 1489, 1117),
    gradient("tab", 1544, -5, 1658, 200),
    "</defs>",
    `<rect x="${f.left + half}" y="${f.top + half}" width="${f.right - f.left - f.strokeWidth}" height="${f.bottom - f.top - f.strokeWidth}" rx="${rectRadius}" ry="${rectRadius}" fill="none" stroke="url(#frame)" stroke-width="${f.strokeWidth}"/>`,
    `<path d="${tabPath}" fill="url(#tab)"/>`,
    "</svg>",
  ].join("");
}
