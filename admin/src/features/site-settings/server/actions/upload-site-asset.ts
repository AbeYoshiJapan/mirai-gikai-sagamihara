"use server";

import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  SITE_ASSET_ALLOWED_TYPES,
  SITE_ASSET_KINDS,
  SITE_ASSET_MAX_BYTES,
  type SiteAssetKind,
} from "../../shared/constants";
import { uploadSiteAssetFile } from "../repositories/site-settings-repository";

export type UploadSiteAssetResult =
  | { url: string; error?: undefined }
  | { url?: undefined; error: string };

/**
 * ロゴ・OGP・運営者写真などを site-assets バケットへアップロードする。
 * FormData: file（画像）, kind（SITE_ASSET_KINDS のいずれか）
 */
export async function uploadSiteAsset(
  formData: FormData
): Promise<UploadSiteAssetResult> {
  try {
    await requireAdmin();

    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!(file instanceof File)) {
      return { error: "ファイルが選択されていません" };
    }
    if (
      typeof kind !== "string" ||
      !SITE_ASSET_KINDS.includes(kind as SiteAssetKind)
    ) {
      return { error: "画像の種類が不正です" };
    }

    const extension = SITE_ASSET_ALLOWED_TYPES[file.type];
    if (!extension) {
      return { error: "PNG・JPEG・WebP・SVG・GIF の画像を選択してください" };
    }
    if (file.size > SITE_ASSET_MAX_BYTES) {
      return {
        error: `ファイルサイズは ${SITE_ASSET_MAX_BYTES / 1024 / 1024}MB 以下にしてください`,
      };
    }

    const url = await uploadSiteAssetFile({
      path: `${kind}/${Date.now()}.${extension}`,
      body: await file.arrayBuffer(),
      contentType: file.type,
    });

    return { url };
  } catch (error) {
    console.error("Upload site asset error:", error);
    return {
      error: getErrorMessage(
        error,
        "画像のアップロード中にエラーが発生しました"
      ),
    };
  }
}
