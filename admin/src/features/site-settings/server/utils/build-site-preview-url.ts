/**
 * 公開前サイトの確認リンク。web の /api/site-preview が Cookie を付けてトップへ飛ばす。
 * 合言葉が未設定なら null（リンクを出さない）。
 */
export function buildSitePreviewUrl(
  webUrl: string,
  secret: string | undefined
): string | null {
  if (!secret) return null;
  const url = new URL("/api/site-preview", webUrl);
  url.searchParams.set("token", secret);
  return url.toString();
}
