import "server-only";

import type { SiteSettingsSection } from "@mirai-gikai/shared/site-settings/schema";
import { createAdminClient } from "@mirai-gikai/supabase";
import { SITE_ASSETS_BUCKET } from "../../shared/constants";

export type SiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
};

export type SiteSettingHistoryRow = {
  id: number;
  key: string;
  value: unknown;
  changed_at: string;
  changed_by: string | null;
};

export async function findAllSiteSettingRows(): Promise<SiteSettingRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, updated_at, updated_by");

  if (error) {
    throw new Error(`サイト設定の取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as SiteSettingRow[];
}

/**
 * 1 セクションを保存する。保存前の値は site_setting_history に残す。
 */
export async function upsertSiteSettingSection(params: {
  section: SiteSettingsSection;
  value: unknown;
  userId: string | null;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: current, error: readError } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("key", params.section)
    .maybeSingle();

  if (readError) {
    throw new Error(`サイト設定の取得に失敗しました: ${readError.message}`);
  }

  if (current) {
    const { error: historyError } = await supabase
      .from("site_setting_history")
      .insert({
        key: params.section,
        value: current.value,
        changed_by: params.userId,
      });

    if (historyError) {
      throw new Error(
        `サイト設定の履歴保存に失敗しました: ${historyError.message}`
      );
    }
  }

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: params.section,
      value: params.value as never,
      updated_at: new Date().toISOString(),
      updated_by: params.userId,
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`サイト設定の保存に失敗しました: ${error.message}`);
  }
}

export async function findSiteSettingHistory(params: {
  section: SiteSettingsSection;
  limit?: number;
}): Promise<SiteSettingHistoryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_setting_history")
    .select("id, key, value, changed_at, changed_by")
    .eq("key", params.section)
    .order("changed_at", { ascending: false })
    .limit(params.limit ?? 20);

  if (error) {
    throw new Error(`サイト設定の履歴取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as SiteSettingHistoryRow[];
}

export async function findSiteSettingHistoryById(
  id: number
): Promise<SiteSettingHistoryRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_setting_history")
    .select("id, key, value, changed_at, changed_by")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`サイト設定の履歴取得に失敗しました: ${error.message}`);
  }

  return (data as SiteSettingHistoryRow | null) ?? null;
}

export async function uploadSiteAssetFile(params: {
  path: string;
  body: ArrayBuffer;
  contentType: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(SITE_ASSETS_BUCKET)
    .upload(params.path, params.body, {
      contentType: params.contentType,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }

  return supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(data.path).data
    .publicUrl;
}
