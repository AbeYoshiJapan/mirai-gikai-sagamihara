/**
 * 議案本文の描画は GFM 非対応のため、Markdown の表を箇条書きに直す。
 * 1列目を太字の見出しにし、残りの列を「／」でつなぐ。
 */
export function tablesToLists(markdown: string): string {
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const out: string[] = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const isTable =
      lines[i].trim().startsWith("|") &&
      /^\|?\s*-{3,}/.test(lines[i + 1]?.trim() ?? "");
    if (!isTable) {
      out.push(lines[i]);
      continue;
    }
    i += 2; // 見出し行と区切り行は読み飛ばす
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      const [head, ...rest] = cells(lines[i]);
      out.push(`- **${head}**：${rest.join(" ／ ")}`);
      i++;
    }
    i--;
  }
  return out.join("\n");
}
