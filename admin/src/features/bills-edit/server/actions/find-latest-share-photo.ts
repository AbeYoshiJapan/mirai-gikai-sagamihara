"use server";

import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { pickLatestShareSourceName } from "../../shared/utils/share-image";
import {
  getBillThumbnailPublicUrl,
  listShareSourcePhotoNames,
} from "../repositories/bill-edit-repository";

/** 前にアップロードしたシェア画像の背景写真（あれば）。作り直しのときに使う */
export async function findLatestSharePhoto(
  billId: string
): Promise<{ url: string | null }> {
  await requireAdmin();
  const parsed = z.string().uuid().safeParse(billId);
  if (!parsed.success) return { url: null };
  const name = pickLatestShareSourceName(
    await listShareSourcePhotoNames(parsed.data),
    parsed.data
  );
  return { url: name ? getBillThumbnailPublicUrl(name) : null };
}
