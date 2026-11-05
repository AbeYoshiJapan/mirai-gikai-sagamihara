import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fetchWithTimeout,
  loadBundledFont,
} from "@mirai-gikai/shared/og/assets";
import {
  brandOgBackgroundPath,
  isBrandPresetId,
} from "@mirai-gikai/shared/site-settings/brand-presets";
import type { SiteSettings } from "@mirai-gikai/shared/site-settings/schema";

/**
 * OGP 画像（/api/og/site）に使う素材。
 * フォントと同梱画像はファイルから読み、ネットワークに出ない。
 * 運営者がアップロードしたロゴ（brand.logo_url）だけは取りに行く（失敗したら同梱のロゴ）。
 * パスは next.config.ts の outputFileTracingIncludes と合わせる。
 */

const FONT_PATH = join(
  process.cwd(),
  "src/assets/fonts/noto-sans-jp-japanese-700.woff"
);

const LOGO_FETCH_TIMEOUT_MS = 3000;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type SiteOgAssets = {
  font: ArrayBuffer | null;
  /** 文字なしの背景 PNG。custom 案で無ければ null（色で塗る） */
  backgroundDataUrl: string | null;
  /** ロゴ（SVG か PNG の data URL）。無ければ null */
  logoDataUrl: string | null;
};

const fileDataUrlPromises = new Map<string, Promise<string | null>>();

function toDataUrl(mime: string, buf: Buffer | ArrayBuffer): string {
  const base64 = Buffer.from(buf as ArrayBuffer).toString("base64");
  return `data:${mime};base64,${base64}`;
}

/** public/ 配下のファイルを data URL にする（プロセス内でキャッシュ） */
function loadPublicFileDataUrl(
  publicPath: string,
  mime: string
): Promise<string | null> {
  const cached = fileDataUrlPromises.get(publicPath);
  if (cached) return cached;
  const promise = readFile(join(process.cwd(), "public", publicPath))
    .then((buf) => toDataUrl(mime, buf))
    .catch((error) => {
      console.warn(`[SiteOg] Failed to read ${publicPath}:`, error);
      fileDataUrlPromises.delete(publicPath);
      return null;
    });
  fileDataUrlPromises.set(publicPath, promise);
  return promise;
}

/** アップロードされたロゴを取りに行く。大きすぎる・取れない・画像でないときは null */
async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, undefined, LOGO_FETCH_TIMEOUT_MS);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!mime.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > LOGO_MAX_BYTES) return null;
    return toDataUrl(mime, buf);
  } catch (error) {
    console.warn("[SiteOg] Failed to fetch uploaded logo:", error);
    return null;
  }
}

export async function loadSiteOgAssets(
  settings: SiteSettings
): Promise<SiteOgAssets> {
  const { brand } = settings;
  const presetId = isBrandPresetId(brand.preset) ? brand.preset : null;

  const [font, backgroundDataUrl, uploadedLogo, bundledLogo] =
    await Promise.all([
      loadBundledFont(FONT_PATH),
      presetId
        ? loadPublicFileDataUrl(brandOgBackgroundPath(presetId), "image/png")
        : Promise.resolve(null),
      brand.logo_url ? fetchLogoDataUrl(brand.logo_url) : Promise.resolve(null),
      presetId
        ? loadPublicFileDataUrl(`/brand/${presetId}/logo.svg`, "image/svg+xml")
        : Promise.resolve(null),
    ]);

  return {
    font,
    backgroundDataUrl,
    logoDataUrl: uploadedLogo ?? bundledLogo,
  };
}
