/**
 * 公開前サイトの確認用 Cookie。
 * /api/site-preview?token=<合言葉> で付与し、(main) layout が検証する。
 */
export const SITE_PREVIEW_COOKIE_NAME = "site_preview";

/** 7 日 */
export const SITE_PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isSitePreviewCookieValid(
  cookieValue: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !cookieValue) return false;
  return cookieValue === secret;
}

export function isSitePreviewTokenValid(
  token: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !token) return false;
  return token === secret;
}
