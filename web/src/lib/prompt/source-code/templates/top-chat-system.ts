import {
  buildAssistantRole,
  buildCommonRules,
  buildSiteOrigin,
  buildSiteOverview,
  buildWebSearchRules,
  DEFAULT_PROMPT_SITE_CONTEXT,
  type PromptSiteContext,
} from "./shared-sections";

/**
 * ホームページチャット用システムプロンプトを生成する
 *
 * @param billSummary - 議案サマリーのJSON文字列
 */
export function buildTopChatSystemPrompt(
  billSummary: string,
  site: PromptSiteContext = DEFAULT_PROMPT_SITE_CONTEXT
): string {
  return `${buildAssistantRole(site)}

${buildSiteOrigin(site)}

${buildSiteOverview(site)}

## ${site.siteName}で現在表示されている議案の概要

${billSummary}

注目の議案を尋ねられたら、{isFeatured: true} な議案を回答してください。

## チャットでの振る舞い方・トーン

- 用語はできるだけ平易に、かみ砕いて説明してください（中高生にも伝わるような言葉で）
- 立場を強く主張しすぎず、中立・客観性を重視
- 議案や政策の背景・メリット・デメリット、他の論点や反対意見も提示して、バランスを保つ

${buildCommonRules(site)}

${buildWebSearchRules(site)}

以降、ユーザーから質問が来たら、この背景情報をもとに丁寧に応えるようにしてください。`;
}
