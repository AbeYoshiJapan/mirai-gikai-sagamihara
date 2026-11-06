import { decodeHtmlBytes } from "@mirai-gikai/shared/council-meetings/decode-html";

/**
 * 議会サイトに名乗る User-Agent。HTTP ヘッダーは ASCII しか送れないので、日本語は入れない
 * （入れると fetch が「Cannot convert argument to a ByteString」で失敗する）。
 */
export const SITE_FETCH_USER_AGENT =
  "mirai-gikai-sagamihara-calendar/0.1 (+https://github.com/AbeYoshiJapan/mirai-gikai-sagamihara)";

export type SitePage = { text: string; charset: string };

/** 議会サイトのページを 1 枚読む。文字コードは応答ヘッダーと meta から決める */
export async function fetchSitePage(
  url: string,
  options: { timeoutMs?: number } = {}
): Promise<SitePage> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": SITE_FETCH_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return decodeHtmlBytes(bytes, response.headers.get("content-type"));
}
