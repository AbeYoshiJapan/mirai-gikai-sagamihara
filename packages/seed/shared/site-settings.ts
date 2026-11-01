import { SAGAMIHARA_PRESET } from "@mirai-gikai/shared/site-settings/presets";
import { SITE_SETTINGS_SECTIONS } from "@mirai-gikai/shared/site-settings/schema";
import type { AdminClient } from "./helper";

/**
 * 開発用のサイト設定。相模原市議会のプリセットを「公開中・初期設定完了」で入れる。
 * ローカルで `pnpm seed` した直後からサイトが表示されるようにする。
 */
export async function seedSiteSettings(supabase: AdminClient) {
  console.log("⚙️  Inserting site settings...");

  const { error: clearError } = await supabase
    .from("site_settings")
    .delete()
    .neq("key", "");
  if (clearError) {
    throw new Error(`Failed to clear site settings: ${clearError.message}`);
  }
  const { error: clearHistoryError } = await supabase
    .from("site_setting_history")
    .delete()
    .gte("id", 0);
  if (clearHistoryError) {
    throw new Error(
      `Failed to clear site setting history: ${clearHistoryError.message}`
    );
  }

  const settings = {
    ...SAGAMIHARA_PRESET,
    site: {
      ...SAGAMIHARA_PRESET.site,
      canonical_url: "http://localhost:3000",
      published: true,
      setup_completed: true,
    },
    operator: {
      ...SAGAMIHARA_PRESET.operator,
      name: "相模原 太郎",
      ward: "南区",
      catchphrase: "開発用のダミー運営者です",
      contact_label: "ご意見・ご要望はこちら",
      contact_url: "https://example.com/contact",
      sns: [{ name: "X", url: "https://x.com/example", icon: "x" }],
    },
    links: {
      ...SAGAMIHARA_PRESET.links,
      fork_repo: "https://github.com/example/mirai-gikai-sagamihara",
    },
  };

  const rows = SITE_SETTINGS_SECTIONS.map((key) => ({
    key,
    value: settings[key],
  }));

  const { error } = await supabase.from("site_settings").insert(rows);
  if (error) {
    throw new Error(`Failed to insert site settings: ${error.message}`);
  }

  console.log(`✅ Inserted ${rows.length} site setting sections`);
}
