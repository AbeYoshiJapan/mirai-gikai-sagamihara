"use client";

import { useSiteSettings } from "@/lib/site-settings/provider";
import type { FuriganaSettings } from "./storage";

/** 管理画面の「ふりがな」の設定を読む */
export function useFuriganaSettings(): FuriganaSettings {
  const { features } = useSiteSettings();
  return {
    available: features.furigana,
    defaultOn: features.furigana_default_on,
  };
}
