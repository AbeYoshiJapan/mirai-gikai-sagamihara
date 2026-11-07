/**
 * 公式の通告一覧が変わったとき、見比べやすくするための行ごとの印。
 * もう片方に同じ行が無い行を「変わった」とする（同じ行が何度も出るときは数で比べる）。
 */
export type OutlineDiffLine = { text: string; changed: boolean };

function markLines(lines: string[], other: string[]): OutlineDiffLine[] {
  const remaining = new Map<string, number>();
  for (const line of other) {
    remaining.set(line, (remaining.get(line) ?? 0) + 1);
  }
  return lines.map((text) => {
    const count = remaining.get(text) ?? 0;
    if (count > 0) {
      remaining.set(text, count - 1);
      return { text, changed: false };
    }
    return { text, changed: true };
  });
}

export function diffOutlines(
  before: string,
  after: string
): {
  before: OutlineDiffLine[];
  after: OutlineDiffLine[];
  changedCount: number;
} {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const marked = {
    before: markLines(beforeLines, afterLines),
    after: markLines(afterLines, beforeLines),
  };
  return {
    ...marked,
    changedCount: marked.after.filter((line) => line.changed).length,
  };
}
