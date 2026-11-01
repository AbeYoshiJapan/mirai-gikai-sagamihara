import {
  buildUntrustedContentGuardInstructions,
  createUntrustedContentNonce,
  type SplitPrompt,
  wrapUntrustedContent,
} from "../prompt-safety/untrusted-content";

/**
 * 解説生成のプロンプト。
 *
 * 原則（墨田区版の運用から継承）:
 * - 数字・日付・金額は一次資料の表記をそのまま使う。計算や換算をしない
 * - 一次資料から読み取れないことは書かない。推測が必要な点は needs_review に出す
 * - 発言した議員の氏名・会派は書かない。「〜との答弁があった」「〜との質疑があった」の形にする
 * - 賛否や政治的な評価をしない。論点は両論を並べる
 * - 出典ブロックは本文に書かせず、コードで末尾に付ける
 */

export type ExplanationPromptBill = {
  name: string;
  bill_number: string | null;
  /** 表示名（条例・予算 など） */
  kind_label: string;
  /** 表示名（市長提出 など） */
  proposer_label: string;
  committee_name: string | null;
  submitted_date: string | null;
  status_note: string | null;
};

export type ExplanationPromptSource = {
  /** 表示名（議案書・会議録 など） */
  kind_label: string;
  label: string;
  url: string;
  meeting_date: string | null;
  /** 抽出本文。無ければ null（リンクだけ） */
  text: string | null;
};

export type ExplanationPromptContext = {
  council_name: string;
  municipality: string;
  resident_label: string;
  session_label: string;
  primary_source_label: string;
};

export type BuildExplanationPromptParams = {
  bill: ExplanationPromptBill;
  sources: ExplanationPromptSource[];
  /** 管理者が貼り付けた補足テキスト（議案書の抜粋など） */
  extra_text: string | null;
  /** 既存のタグ名。候補はできるだけここから選ばせる */
  existing_tags: string[];
  context: ExplanationPromptContext;
  nonce?: string;
};

/** 一次資料の本文として渡す上限（文字）。超えた分は切り、その旨を伝える */
export const MAX_SOURCE_TEXT_CHARS = 60_000;

export function buildBillExplanationPrompt(
  params: BuildExplanationPromptParams
): SplitPrompt {
  const nonce = params.nonce ?? createUntrustedContentNonce();
  const { bill, context } = params;

  const system = `あなたは${context.council_name}の議案を、${context.municipality}の${context.resident_label}向けにわかりやすく説明する編集者です。
与えられた一次資料（議案書・会議録・審議結果など）だけを根拠に、議案の解説を書きます。

## 守ること
- 根拠は一次資料だけ。資料に無いことは書かない。一般知識で補いたくなる箇所は needs_review に「何を確認すべきか」を書く
- 数字・日付・金額・条文番号は資料の表記をそのまま使う。四捨五入・換算・合計の計算をしない
- 発言した議員の氏名・会派名は書かない。「〜との質疑があった」「〜との答弁があった」の形にする
- 賛成・反対の立場を取らない。評価の言葉（画期的、問題だ、など）を使わない。論点は賛否両方の見方を並べる
- 提出者（市長・議員など）と付託先の委員会は、資料で確認できる範囲で書く
- 出典の一覧は書かない（システムが末尾に付ける）
- 出力は日本語

## 出力
2 つの難易度の解説と、タグ候補、用語候補、要確認の一覧を JSON で返す。

### normal（やさしい版）
- title: 一覧に出す見出し。何がどう変わるかが一目でわかる 30 字以内の言い切り（例:「学校給食が無料になる条例」）
- summary: 2〜3 文。誰に・何が・いつから、を優先
- content: Markdown。次の見出しで構成する。該当する内容が資料に無い見出しは省く
  - ## この議案でどうなる？
  - ## 背景
  - ## 具体的な内容
  - ## 影響を受ける人・お金のこと
  - ## 議会での論点（質疑・答弁があれば。氏名は書かない）
  - ## 今後の予定（審議日程・施行日など）
- 中学生にも読める言葉で。専門用語には短い説明を添える

### hard（くわしい版）
- title: 正式名称に近い、内容が正確にわかる見出し（40 字以内）
- summary: 2〜3 文。制度の位置づけを含める
- content: Markdown。次の見出しで構成する。該当する内容が資料に無い見出しは省く
  - ## 議案の概要（正式名称・議案番号・提出者・付託先）
  - ## 改正・制定の内容（条文や事業ごとに）
  - ## 財政・予算への影響
  - ## 経緯と根拠法令
  - ## 審議の経過と論点
  - ## 施行時期と今後の手続き

### tag_suggestions
- 既存のタグ名: ${params.existing_tags.length > 0 ? params.existing_tags.join("、") : "（なし）"}
- できるだけ既存のタグ名から選ぶ。合うものが無ければ新しい短い名前を 1〜2 個まで。最大 5 個

### glossary_suggestions
- 本文に出る専門用語のうち、${context.resident_label}に説明が要るものを最大 8 個。定義は 1〜2 文

### needs_review
- 資料から断定できなかった点、資料どうしが食い違う点、本文で推測を含めざるを得なかった点を列挙する
- location は見出し名や該当箇所の短い引用、reason は「誰が何を確かめれば解消するか」がわかるように
- 本文にその点を書いた場合は、本文側にも「（要確認）」と添える
- 何も無ければ空配列

${buildUntrustedContentGuardInstructions(nonce)}`;

  const meta = [
    `議案名: ${bill.name}`,
    bill.bill_number ? `議案番号: ${bill.bill_number}` : null,
    `種類: ${bill.kind_label}`,
    `提出者: ${bill.proposer_label}`,
    bill.committee_name ? `付託先: ${bill.committee_name}` : null,
    bill.submitted_date ? `提出日: ${bill.submitted_date}` : null,
    bill.status_note ? `審議状況の補足: ${bill.status_note}` : null,
    `議会: ${context.council_name}（${context.session_label}）`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const sourceBlocks: string[] = [];
  let remaining = MAX_SOURCE_TEXT_CHARS;
  for (const source of params.sources) {
    const header = `### ${source.kind_label}: ${source.label || source.url}${source.meeting_date ? `（${source.meeting_date}）` : ""}`;
    if (!source.text) {
      sourceBlocks.push(`${header}\n（本文は未取得。リンクのみ: ${source.url}）`);
      continue;
    }
    const text = source.text.slice(0, Math.max(0, remaining));
    remaining -= text.length;
    const truncated = text.length < source.text.length;
    sourceBlocks.push(
      `${header}\n${text}${truncated ? "\n（この資料は長いため途中までです）" : ""}`
    );
  }
  if (params.extra_text?.trim()) {
    const text = params.extra_text.trim().slice(0, Math.max(0, remaining));
    sourceBlocks.push(`### 管理者が貼り付けた資料\n${text}`);
  }

  const user = `## 議案の情報
${meta}

## 一次資料
${wrapUntrustedContent(
  sourceBlocks.length > 0 ? sourceBlocks.join("\n\n") : "（一次資料の本文はありません）",
  nonce
)}

上の一次資料だけを根拠に、指示されたスキーマで解説を作ってください。`;

  return { system, user };
}

/**
 * 本文末尾に付ける出典ブロック。モデルには書かせず、登録済みの一次資料から作る。
 */
export function buildSourcesBlock(
  sources: readonly { kind_label: string; label: string; url: string; meeting_date: string | null }[],
  primarySourceLabel: string
): string {
  if (sources.length === 0) {
    return `## 出典\n\n- ${primarySourceLabel}`;
  }
  const lines = sources.map((s) => {
    const name = s.label || s.kind_label;
    const date = s.meeting_date ? `（${s.meeting_date}）` : "";
    return `- [${name}${date}](${s.url})`;
  });
  return `## 出典\n\n${lines.join("\n")}`;
}

/** 下書きに反映するときの本文（本文 + 出典ブロック）。既に出典見出しがあれば二重にしない */
export function appendSourcesBlock(content: string, sourcesBlock: string): string {
  const trimmed = content.trimEnd();
  if (/^##\s*出典\s*$/m.test(trimmed)) return trimmed;
  return `${trimmed}\n\n${sourcesBlock}\n`;
}
