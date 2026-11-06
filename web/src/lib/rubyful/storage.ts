/**
 * Rubyful LocalStorage utilities
 * ルビ表示設定の永続化を管理
 */

const STORAGE_KEY = "rubyful-enabled";

/** 管理画面の「ふりがな」の設定（features.furigana / furigana_default_on） */
export type FuriganaSettings = {
  /** ふりがなを使えるようにするか。false ならだれにも出さない */
  available: boolean;
  /** まだ切り替えていない人にも、最初から出すか */
  defaultOn: boolean;
};

export const DEFAULT_FURIGANA_SETTINGS: FuriganaSettings = {
  available: true,
  defaultOn: false,
};

/**
 * 保存された選択（"true" / "false" / 未保存）とサイトの設定から、
 * ふりがなを出すかを決める。見る人が選んだ内容がサイトの既定より優先。
 */
export function resolveRubyEnabled(
  stored: string | null,
  settings: FuriganaSettings
): boolean {
  if (!settings.available) return false;
  if (stored === "true") return true;
  if (stored === "false") return false;
  return settings.defaultOn;
}

/**
 * LocalStorageからルビ表示設定を取得
 */
export function getRubyEnabledFromStorage(
  settings: FuriganaSettings = DEFAULT_FURIGANA_SETTINGS
): boolean {
  if (typeof window === "undefined") return false;
  return resolveRubyEnabled(localStorage.getItem(STORAGE_KEY), settings);
}

/**
 * LocalStorageにルビ表示設定を保存
 */
export function setRubyEnabledToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled.toString());
}
