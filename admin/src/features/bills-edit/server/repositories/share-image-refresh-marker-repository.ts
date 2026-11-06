import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { ShareImageRefreshMarker } from "../../shared/utils/share-image-refresh";

/**
 * 朝の見直しの印は、サイト設定の表に内部用のキーで置く（サイト設定の画面や公開サイトには出ない。
 * 設定として読むのは決まった区分のキーだけなので、このキーは無視される）。
 */
const MARKER_KEY = "internal:share_image_refresh";

export async function findShareImageRefreshMarkerValue(): Promise<unknown> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", MARKER_KEY)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to read share image refresh marker: ${error.message}`
    );
  }
  return data?.value ?? null;
}

export async function saveShareImageRefreshMarker(
  marker: ShareImageRefreshMarker
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: MARKER_KEY,
    value: marker,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(
      `Failed to save share image refresh marker: ${error.message}`
    );
  }
}

export async function deleteShareImageRefreshMarker(): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .delete()
    .eq("key", MARKER_KEY);
  if (error) {
    throw new Error(
      `Failed to delete share image refresh marker: ${error.message}`
    );
  }
}
