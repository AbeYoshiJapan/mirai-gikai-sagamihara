/** 議案の解説本文に差し込む案内カードの指定 */
export type MarkdownTips = {
  /** 「わからない言葉を長押しで選択すると AI に質問できます」（AI チャットが使えるときだけ） */
  askAi?: boolean;
  /** 「説明の詳しさをいつでも切り替えられます」 */
  difficulty?: boolean;
};

export type TipInjection = {
  targetH2Index: number;
  tagName: "LongPressSection" | "DifficultyInfoCard";
};

/**
 * 解説本文の見出しの間に差し込む案内カードを決める。
 *
 * 規約・掲載方針などの文書ページでは何も差し込まない（既定）。
 * AI に質問する案内は、AI チャットが使えるときだけ出す。この版では AI チャットを
 * 使わないため、使えない機能を案内しないようにする。
 */
export function buildTipInjections(tips: MarkdownTips = {}): TipInjection[] {
  const injections: TipInjection[] = [];
  if (tips.askAi) {
    injections.push({ targetH2Index: 3, tagName: "LongPressSection" });
  }
  if (tips.difficulty) {
    injections.push({ targetH2Index: -1, tagName: "DifficultyInfoCard" });
  }
  return injections;
}
