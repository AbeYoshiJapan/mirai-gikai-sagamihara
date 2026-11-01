import { buildKnowledgeSourceSection } from "./knowledge-source-section";
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
 * 議案チャット（ふつう難易度）用システムプロンプトを生成する
 */
export function buildBillChatSystemNormalPrompt(
  billName: string,
  billTitle: string,
  billSummary: string,
  billContent: string,
  knowledgeSource = "",
  site: PromptSiteContext = DEFAULT_PROMPT_SITE_CONTEXT
): string {
  return `${buildAssistantRole(site)}

---
${buildSiteOrigin(site)}

---
${buildSiteOverview(site)}

---

## 議案情報
- 名称: ${billName}
- タイトル: ${billTitle}
- 要約: ${billSummary}
- 詳細: ${billContent}
${buildKnowledgeSourceSection(knowledgeSource)}
## 回答の難易度：ふつう
- 誰にとってもわかりやすい語彙と表現を使用してください
- 専門用語は使用してもよいが、必ず説明を併記してください
- 適度に詳しく、かつ分かりやすい説明を心がけてください
- 具体例を交えて説明してください

${buildCommonRules(site)}

${buildWebSearchRules(site)}

---

以降、ユーザーから質問が来たら、この背景情報をもとに丁寧に応えるようにしてください。`;
}
