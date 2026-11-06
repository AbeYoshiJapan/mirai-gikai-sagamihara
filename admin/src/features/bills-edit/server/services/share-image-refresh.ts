import "server-only";

import { resolveSiteSettings } from "@mirai-gikai/shared/site-settings/resolve";
import { after } from "next/server";
import { findAllSiteSettingRows } from "@/features/site-settings/server/repositories/site-settings-repository";
import { env } from "@/lib/env";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import {
  listMissingShareImageAssets,
  parseShareImageInput,
} from "../../shared/utils/share-image";
import {
  buildShareImageFileName,
  computeShareImageStamp,
  parseShareImageSpec,
  type ShareImageRefreshTarget,
  type ShareImageSpec,
  selectShareImagesToRefresh,
  shareImageSpecFileName,
} from "../../shared/utils/share-image-refresh";
import {
  downloadBillThumbnailText,
  findBillsWithShareThumbnail,
  updateBillShareThumbnailUrl,
  uploadBillThumbnailFile,
} from "../repositories/bill-edit-repository";
import {
  loadShareImageAssets,
  renderShareImage,
  type ShareImageAssets,
} from "../utils/render-share-image";

/**
 * テンプレートから作ったシェア画像を保存する。作り方（タイトル・背景写真・サイト名）を
 * 画像と同じ名前の .json に書いておき、サイト名が変わったときに作り直せるようにする。
 * 返り値は画像の公開 URL。
 */
export async function saveGeneratedShareImage(params: {
  billId: string;
  png: ArrayBuffer;
  spec: ShareImageSpec;
}): Promise<string> {
  const fileName = buildShareImageFileName(
    params.billId,
    Date.now(),
    computeShareImageStamp(params.spec.siteName)
  );
  // 作り方を先に置く（画像だけがあって作り直せない状態を作らない）
  await uploadBillThumbnailFile({
    fileName: shareImageSpecFileName(fileName),
    body: await new Blob([JSON.stringify(params.spec)]).arrayBuffer(),
    contentType: "application/json",
  });
  return uploadBillThumbnailFile({
    fileName,
    body: params.png,
    contentType: "image/png",
  });
}

export type ShareImageRefreshResult = {
  /** いまのサイト名になっていなかった画像の数 */
  outdated: number;
  updated: number;
  failed: number;
  /** 時間切れで次に回した数 */
  remaining: number;
};

async function regenerateShareImage(
  target: ShareImageRefreshTarget,
  context: { siteName: string; assets: ShareImageAssets }
): Promise<void> {
  const text = await downloadBillThumbnailText(
    shareImageSpecFileName(target.fileName)
  );
  const spec = text ? parseShareImageSpec(text) : null;
  if (!spec) throw new Error("シェア画像の作り方（.json）を読めませんでした");

  const input = parseShareImageInput({
    title: spec.title,
    photoUrl: spec.photoUrl,
    supabaseUrl: env.supabaseUrl,
    requirePhoto: true,
  });
  if (!input.ok) throw new Error(input.error);

  const image = await renderShareImage({
    ...input,
    assets: context.assets,
    siteName: context.siteName,
  });
  const url = await saveGeneratedShareImage({
    billId: target.billId,
    png: await image.arrayBuffer(),
    spec: {
      ...spec,
      siteName: context.siteName,
      generatedAt: new Date().toISOString(),
    },
  });
  await updateBillShareThumbnailUrl(target.billId, url);
}

/**
 * サイト設定のサイト名と違う名前で作ったシェア画像を、いまの名前で作り直す。
 * 手でアップロードした画像には触れない。時間（budgetMs）を超えた分は次の機会
 * （次の設定保存か、毎朝の自動処理）に回す。前の画像は消さない（すでにシェアされた投稿が参照しているため）。
 */
export async function refreshShareImagesForSiteName(
  options: { budgetMs?: number } = {}
): Promise<ShareImageRefreshResult> {
  const budgetMs = options.budgetMs ?? 40_000;
  const startedAt = Date.now();

  // 読み込みに失敗したときに既定のサイト名で作り直さないよう、失敗は例外のまま上げる
  const { settings } = resolveSiteSettings(await findAllSiteSettingRows());
  const siteName = settings.site.name;
  const targets = selectShareImagesToRefresh(
    await findBillsWithShareThumbnail(),
    env.supabaseUrl,
    computeShareImageStamp(siteName)
  );
  const result: ShareImageRefreshResult = {
    outdated: targets.length,
    updated: 0,
    failed: 0,
    remaining: 0,
  };
  if (targets.length === 0) return result;

  const assets = await loadShareImageAssets();
  if (listMissingShareImageAssets(assets).length > 0) {
    // フォントかロゴを読めないと崩れた画像になる。次の機会に回す
    return { ...result, remaining: targets.length };
  }

  for (const [index, target] of targets.entries()) {
    if (Date.now() - startedAt > budgetMs) {
      result.remaining = targets.length - index;
      break;
    }
    try {
      await regenerateShareImage(target, { siteName, assets });
      result.updated++;
    } catch (error) {
      console.error(
        `[ShareImageRefresh] Failed to regenerate ${target.fileName}:`,
        error
      );
      result.failed++;
    }
  }

  if (result.updated > 0) {
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  }
  return result;
}

/**
 * 応答を返した後に、シェア画像をいまのサイト名で作り直す（サイト設定を保存したとき用）。
 * 作り直すものが無ければすぐ終わる。
 */
export function scheduleShareImageRefresh(): void {
  after(async () => {
    try {
      const result = await refreshShareImagesForSiteName();
      if (result.outdated > 0) {
        console.info("[ShareImageRefresh]", result);
      }
    } catch (error) {
      console.error("[ShareImageRefresh] Failed:", error);
    }
  });
}
