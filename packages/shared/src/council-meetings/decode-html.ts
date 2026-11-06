/**
 * 議会サイトの HTML のバイト列を文字にする。
 *
 * fetch の response.text() は常に UTF-8 として読むので、Shift_JIS や EUC-JP のページは文字化けする。
 * 応答ヘッダー（Content-Type の charset）→ ページ先頭の meta → UTF-8 の順で文字コードを決める。
 */

const CHARSET_IN_CONTENT_TYPE = /charset\s*=\s*["']?([\w-]+)/i;
const META_CHARSET = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i;

/** 表記ゆれをそろえる（TextDecoder が受け付ける名前にする） */
function normalizeCharset(charset: string): string {
  const lower = charset.toLowerCase();
  if (["shift-jis", "sjis", "x-sjis", "ms932", "windows-31j", "cp932"].includes(lower)) {
    return "shift_jis";
  }
  if (lower === "eucjp" || lower === "x-euc-jp") return "euc-jp";
  return lower;
}

/** 文字コードを決める。分からなければ utf-8 */
export function detectHtmlCharset(
  bytes: Uint8Array,
  contentType: string | null
): string {
  const fromHeader = contentType?.match(CHARSET_IN_CONTENT_TYPE)?.[1];
  if (fromHeader) return normalizeCharset(fromHeader);
  // meta は ASCII で書かれているので、先頭だけ latin1 で読んで探す
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const fromMeta = head.match(META_CHARSET)?.[1];
  return fromMeta ? normalizeCharset(fromMeta) : "utf-8";
}

export function decodeHtmlBytes(
  bytes: Uint8Array,
  contentType: string | null
): { text: string; charset: string } {
  const charset = detectHtmlCharset(bytes, contentType);
  try {
    return { text: new TextDecoder(charset).decode(bytes), charset };
  } catch {
    // 知らない名前なら UTF-8 で読む
    return { text: new TextDecoder("utf-8").decode(bytes), charset: "utf-8" };
  }
}
