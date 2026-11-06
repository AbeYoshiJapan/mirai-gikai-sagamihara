import { vi } from "vitest";

// 統合テストは Node.js 環境で実行するため、Next.js の "server-only"
// ガードを無効化する。これはビルド時チェックのバイパスであり、
// アプリケーションロジックのモックではない。
vi.mock("server-only", () => ({}));

// 統合テストはリクエストスコープ外で実行するため、Next.js の
// cookies()/headers() を空のスタブに置き換える。
// アプリケーションロジックのモックではなく、フレームワーク境界のバイパスである。
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: () => undefined,
      getAll: () => [],
      has: () => false,
    }),
  headers: () => Promise.resolve(new Headers()),
}));

// 統合テストは Next.js のインクリメンタルキャッシュ機構を持たないため、
// unstable_cache をキャッシュなしで直接実行するスタブに置き換える。
vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T) =>
    (...args: Parameters<T>) =>
      fn(...args),
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
}));

// 本家由来の API ルートのテストは、利用者向け AI 機能（インタビュー・トピック分析・チャット）と
// オープンデータ API が有効な前提で書かれている。この相模原版では既定が OFF なので、
// テスト用の DB にだけ「機能」の設定を入れて有効にする（サイト設定の読み込みは本物を通す）。
// ただし AI チャット・AI インタビューは掲載方針で常に無効（locked-features.ts）なので、
// ここで true を入れても読み込み時に false に戻る。その挙動もルートのテストで確かめている。
import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { beforeAll } from "vitest";
import { adminClient } from "@test-utils/utils";

beforeAll(async () => {
  const { error } = await adminClient.from("site_settings").upsert(
    {
      key: "features",
      value: {
        ...DEFAULT_SITE_SETTINGS.features,
        ai_chat: true,
        ai_interview: true,
        topic_analysis: true,
        open_data_api: true,
      },
    },
    { onConflict: "key" }
  );
  if (error) {
    throw new Error(`テスト用のサイト設定を入れられませんでした: ${error.message}`);
  }
});
