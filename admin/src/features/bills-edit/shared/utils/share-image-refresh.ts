import { z } from "zod";
import { BILL_THUMBNAILS_BUCKET } from "../constants";

/**
 * シェア画像のテンプレート（枠・タブ・ロゴの見た目）の版。
 * 見た目を変えたら上げる。上げた後にサイト設定の「サイト」を一度保存すると、
 * 作成済みのシェア画像が新しい見た目で作り直される。
 */
export const SHARE_IMAGE_TEMPLATE_VERSION = 1;

/**
 * 画像に入れたサイト名とテンプレートの版を表す短い印（16 進 8 桁）。
 * ファイル名に入れておき、いまのサイト設定と合っているかを画像を開かずに見分ける。
 */
export function computeShareImageStamp(siteName: string): string {
  // FNV-1a（32 ビット）。見分けるための印なので、暗号的な強さは要らない
  const text = `v${SHARE_IMAGE_TEMPLATE_VERSION}:${siteName}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** テンプレートから作ったシェア画像のファイル名（share_<議案ID>_<時刻>_<印>.png） */
export function buildShareImageFileName(
  billId: string,
  time: number,
  stamp: string
): string {
  return `share_${billId}_${time}_${stamp}.png`;
}

/** 作り方（タイトル・背景写真）を書いておくファイル。画像と同じ名前で拡張子だけ .json */
export function shareImageSpecFileName(imageFileName: string): string {
  return imageFileName.replace(/\.png$/, ".json");
}

const GENERATED_SHARE_IMAGE_NAME =
  /^share_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d+)_([0-9a-f]{8})\.png$/;

export type GeneratedShareImageName = {
  billId: string;
  stamp: string;
  fileName: string;
};

/**
 * 議案のシェア画像の URL が、テンプレートから作った画像（印つき）ならその情報を返す。
 * 手でアップロードした画像や、印を付ける前に作った画像は null（自動では作り直さない）。
 */
export function parseGeneratedShareImageUrl(
  url: string | null | undefined,
  supabaseUrl: string
): GeneratedShareImageName | null {
  if (!url) return null;
  let image: URL;
  let supabase: URL;
  try {
    image = new URL(url);
    supabase = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (image.origin !== supabase.origin) return null;
  const prefix = `/storage/v1/object/public/${BILL_THUMBNAILS_BUCKET}/`;
  if (!image.pathname.startsWith(prefix)) return null;
  const fileName = image.pathname.slice(prefix.length);
  const match = GENERATED_SHARE_IMAGE_NAME.exec(fileName);
  if (!match) return null;
  return { billId: match[1], stamp: match[3], fileName };
}

export type ShareImageRefreshTarget = {
  billId: string;
  fileName: string;
};

/**
 * いまのサイト名（印）と違う印のシェア画像を持つ議案。
 * 画像のファイル名の議案 ID が、その議案と違うもの（よその議案の画像を流用したもの）は触らない。
 */
export function selectShareImagesToRefresh(
  bills: { id: string; share_thumbnail_url: string | null }[],
  supabaseUrl: string,
  currentStamp: string
): ShareImageRefreshTarget[] {
  const targets: ShareImageRefreshTarget[] = [];
  for (const bill of bills) {
    const name = parseGeneratedShareImageUrl(
      bill.share_thumbnail_url,
      supabaseUrl
    );
    if (!name || name.billId !== bill.id || name.stamp === currentStamp) {
      continue;
    }
    targets.push({ billId: bill.id, fileName: name.fileName });
  }
  return targets;
}

const shareImageSpecSchema = z.object({
  version: z.literal(1),
  /** 運営者が入れたタイトル（改行を含む） */
  title: z.string().min(1),
  /** 背景写真の URL */
  photoUrl: z.string().min(1),
  /** 画像に入れたサイト名 */
  siteName: z.string(),
  generatedAt: z.string(),
});

export type ShareImageSpec = z.infer<typeof shareImageSpecSchema>;

export function buildShareImageSpec(params: {
  title: string;
  photoUrl: string;
  siteName: string;
  now: Date;
}): ShareImageSpec {
  return {
    version: 1,
    title: params.title,
    photoUrl: params.photoUrl,
    siteName: params.siteName,
    generatedAt: params.now.toISOString(),
  };
}

export function parseShareImageSpec(text: string): ShareImageSpec | null {
  try {
    const result = shareImageSpecSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export type ShareImageRefreshResult = {
  /** いまのサイト名になっていなかった画像の数 */
  outdated: number;
  updated: number;
  failed: number;
  /** 時間切れで次に回した数 */
  remaining: number;
};

/** 作り直しが残らず終わったか（作り直すものが無かった場合も含む） */
export function isShareImageRefreshComplete(
  result: ShareImageRefreshResult
): boolean {
  return (
    result.outdated === 0 || (result.remaining === 0 && result.failed === 0)
  );
}

/**
 * 朝の見直しの印。サイト名を変えたときに作り直しが要り、まだ終わっていないことを表す。
 * attempts は、作り直しが進まなかった朝の回数。
 */
const shareImageRefreshMarkerSchema = z.object({
  since: z.string(),
  attempts: z.number().int().min(0),
});

export type ShareImageRefreshMarker = z.infer<
  typeof shareImageRefreshMarkerSchema
>;

export function parseShareImageRefreshMarker(
  value: unknown
): ShareImageRefreshMarker | null {
  const result = shareImageRefreshMarkerSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** 作り直しが進まない朝がこの回数続いたら、朝の見直しをやめる */
export const SHARE_IMAGE_REFRESH_MAX_ATTEMPTS = 3;

/**
 * 朝の見直しをするか。印が無い（サイト名が変わっていない、または作り直しが終わっている）
 * なら何もしない。
 */
export function decideMorningShareImageRefresh(
  marker: ShareImageRefreshMarker | null
): "skip" | "give_up" | "run" {
  if (!marker) return "skip";
  if (marker.attempts >= SHARE_IMAGE_REFRESH_MAX_ATTEMPTS) return "give_up";
  return "run";
}
