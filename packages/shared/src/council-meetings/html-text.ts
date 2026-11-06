/**
 * 議会サイトの HTML から文字を取り出す小さな道具。
 * 依存を増やさないため正規表現で済ませる（相手は決まった CMS の出力で、表と段落だけ読む）。
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** HTML の文字参照を戻す */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** 全角英数を半角にし、空白をまとめる */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** タグを外して、表示される文字だけにする（1 行にまとめる） */
export function stripTags(html: string): string {
  return normalizeText(decodeEntities(html.replace(/<[^>]*>/g, " ")));
}

/**
 * ページ全体を、段落・表の行ごとに改行した文字にする。
 * script・style・ヘッダー・ナビ・フッターは捨てる（日付や「場所」を拾い違えないため）。
 */
export function htmlToLines(html: string): string[] {
  const body = html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|dt|dd|h[1-6]|table|section|article)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ");
  return decodeEntities(body.replace(/<[^>]*>/g, " "))
    .split("\n")
    .map((line) => normalizeText(line))
    .filter((line) => line.length > 0);
}
