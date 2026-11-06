import { LOCKED_OFF_FEATURES } from "@mirai-gikai/shared/site-settings/locked-features";
import {
  SAGAMIHARA_NAME_NOTE_MD,
  SAGAMIHARA_PRESET,
  SAGAMIHARA_SESSION_SYSTEM_MD,
} from "@mirai-gikai/shared/site-settings/presets";
import type { SiteSettingsSection } from "@mirai-gikai/shared/site-settings/schema";
import { DEFAULT_EDITORIAL_POLICY_MD } from "@mirai-gikai/shared/site-settings/templates";
import type { SiteAssetKind } from "./constants";

/**
 * サイト設定フォームの項目定義。
 * 設定画面（/settings）と初期設定ウィザード（/setup）はこの定義からフォームを描画する。
 * name はセクション内のパス（例: "colors.primary"）。
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "url"
  | "color"
  | "boolean"
  | "number"
  | "select"
  | "image"
  | "string-list"
  | "date";

export type FieldOption = { value: string; label: string };

export type FieldDefinition = {
  name: string;
  label: string;
  kind: FieldKind;
  description?: string;
  placeholder?: string;
  options?: FieldOption[];
  /** kind: "image" のときアップロード先の種別 */
  assetKind?: SiteAssetKind;
  /** kind: "textarea" / "markdown" の行数 */
  rows?: number;
  /** 幅いっぱいに出す（既定は 2 カラム） */
  fullWidth?: boolean;
  /** テンプレートの {{key}} 差し込みが使える */
  templated?: boolean;
  /** 「ひな形を入れる」ボタンで入れられる文面（textarea / markdown 用） */
  samples?: { label: string; value: string }[];
  /** この版では変えられない項目。理由を説明として出し、入力を無効にする */
  locked?: string;
};

/** 配列を表で編集する専用エディタ */
export type ArrayEditorKind = "sns" | "import_sources";
/** 専用エディタで扱う項目。配列の表か、ブランド案の選択 */
export type CustomEditor = ArrayEditorKind | "brand_preset";

export type FieldGroup = {
  title: string;
  description?: string;
  fields: FieldDefinition[];
  /** 専用エディタで扱う配列。name はセクション内のパス */
  custom?: { editor: CustomEditor; name: string };
};

export type SectionDefinition = {
  section: SiteSettingsSection;
  label: string;
  description: string;
  groups: FieldGroup[];
};

export const SNS_ICON_OPTIONS: FieldOption[] = [
  { value: "x", label: "X（旧 Twitter）" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "line", label: "LINE" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "note", label: "note" },
  { value: "threads", label: "Threads" },
  { value: "web", label: "Web サイト" },
];

const TEMPLATE_HELP =
  "{{site_name}} {{council_name}} {{municipality}} {{operator_name}} {{operator_title}} {{fork_repo}} {{modified_on}} {{contact_url}} などを差し込めます";

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    section: "site",
    label: "サイト",
    description: "サイト名・説明文・公開状態。",
    groups: [
      {
        title: "基本情報",
        fields: [
          {
            name: "name",
            label: "サイト名",
            kind: "text",
            placeholder: "さがみはら市議会ナウ！",
            description:
              "「みらい議会」の名称を使うときは、フォークガイドラインにより「みらい議会＠地域名」の形式にします。独自の名前（「みらい議会」を含まない名前）でもかまいません。ヘッダーに 1 行で入るのは 16 文字くらいまでです",
          },
          {
            name: "tagline",
            label: "キャッチコピー",
            kind: "text",
            placeholder: "議案に意見！議会をもっと身近に。",
            description: "ヘッダーのサイト名の下に出ます（スマホでも表示）",
          },
          {
            name: "name_note_md",
            label: "サイト名について（由来・込めた思い）",
            kind: "markdown",
            rows: 6,
            fullWidth: true,
            templated: true,
            description:
              "トップの「このサイトについて」に出します。チームみらいの「みらい議会」をもとにしていることと、名前の由来を書きます。空なら出しません",
            samples: [
              {
                label: "相模原市議会のひな形",
                value: SAGAMIHARA_NAME_NOTE_MD,
              },
            ],
          },
          {
            name: "description",
            label: "サイト説明文",
            kind: "textarea",
            rows: 3,
            fullWidth: true,
            description: "検索結果や SNS シェアで表示される説明文（300字まで）",
          },
          {
            name: "canonical_url",
            label: "本番 URL",
            kind: "url",
            placeholder: "https://example.jp",
            description: "sitemap・canonical・OGP に使います",
          },
          {
            name: "timezone",
            label: "タイムゾーン",
            kind: "text",
            placeholder: "Asia/Tokyo",
          },
        ],
      },
      {
        title: "公開状態",
        fields: [
          {
            name: "published",
            label: "公開中",
            kind: "boolean",
            description: "オフの間、公開サイトは「準備中」ページを表示します",
          },
          {
            name: "setup_completed",
            label: "初期設定完了",
            kind: "boolean",
            description: "初期設定ウィザードを終えると自動でオンになります",
          },
        ],
      },
    ],
  },
  {
    section: "council",
    label: "議会",
    description: "議会名・会期の呼び方・委員会・ステータス表示。",
    groups: [
      {
        title: "議会",
        fields: [
          {
            name: "name",
            label: "議会名",
            kind: "text",
            placeholder: "相模原市議会",
          },
          {
            name: "municipality",
            label: "自治体名",
            kind: "text",
            placeholder: "相模原市",
          },
          {
            name: "kind",
            label: "自治体の種別",
            kind: "select",
            options: [
              { value: "city", label: "市" },
              { value: "ward", label: "特別区" },
              { value: "town", label: "町" },
              { value: "village", label: "村" },
              { value: "prefecture", label: "都道府県" },
            ],
          },
          {
            name: "session_model",
            label: "会期の方式",
            kind: "select",
            options: [
              { value: "year_round", label: "通年議会" },
              { value: "regular", label: "定例会制" },
            ],
            description: "通年議会は 1 年を 1 会期として扱います",
          },
          {
            name: "year_start_month",
            label: "議会年度の開始月",
            kind: "number",
          },
          {
            name: "year_start_day",
            label: "議会年度の開始日",
            kind: "number",
          },
        ],
      },
      {
        title: "呼び方",
        description: "サイト内の文言に差し込まれます。",
        fields: [
          {
            name: "session_label",
            label: "会議期間の呼称",
            kind: "text",
            placeholder: "定例会議",
          },
          {
            name: "resident_label",
            label: "住民の呼称",
            kind: "text",
            placeholder: "市民",
          },
          {
            name: "scope_label",
            label: "議会・行政の総称",
            kind: "text",
            placeholder: "市議会・市政",
          },
          {
            name: "primary_source_label",
            label: "一次資料の総称",
            kind: "text",
            placeholder: "相模原市議会の議案書・会議録",
          },
          {
            name: "in_progress_label",
            label: "審議中の表示",
            kind: "text",
            placeholder: "市議会審議中",
            description: "定例会議の期間中で、まだ結論が出ていない議案",
          },
          {
            name: "carried_over_label",
            label: "継続中の表示",
            kind: "text",
            placeholder: "継続中",
            description:
              "定例会議と定例会議の間で、結論が次へ持ち越されている議案。期間は「会期管理」の定例会議などの期間で決まります",
          },
          {
            name: "upcoming_label",
            label: "審議予定の表示",
            kind: "text",
            placeholder: "審議予定",
            description:
              "次の定例会議に向けて出され、まだ開会前の議案（開会の2週間前以降に出されたもの）",
          },
        ],
      },
      {
        title: "会期の制度",
        description:
          "通年議会など、会期の制度の表示と説明。制度の名前を入れると、トップの議会カードに制度名が出て「○○とは」の説明ページが開けるようになります。空なら出しません。",
        fields: [
          {
            name: "session_system_label",
            label: "制度の名前",
            kind: "text",
            placeholder: "通年議会",
            description: "トップの議会カードの右上に出ます",
            samples: [
              {
                label: "相模原市議会のひな形",
                value: SAGAMIHARA_PRESET.council.session_system_label,
              },
            ],
          },
          {
            name: "session_system_summary",
            label: "制度の一行説明",
            kind: "text",
            placeholder:
              "1年を1つの会期とし、その中で年4回の定例会議を議長が招集して審議します",
            description: "説明ページの冒頭と、制度名のリンクの補足に出ます",
            samples: [
              {
                label: "相模原市議会のひな形",
                value: SAGAMIHARA_PRESET.council.session_system_summary,
              },
            ],
          },
          {
            name: "out_of_period_label",
            label: "会議期間の外の日の表示",
            kind: "text",
            placeholder:
              "空なら自動（通年議会: 会期中（定例会議の間）／定例会制: 閉会中）",
            description:
              "定例会議などの期間に入っていない日に、議会カードの「本日は」の横に出す文言",
          },
          {
            name: "countdown_open_label",
            label: "次の会議期間までの日数の見出し",
            kind: "text",
            placeholder: "空なら「開会まで」",
            description: "例: 「12月定例会議　開会まで 21 日」",
          },
          {
            name: "countdown_close_label",
            label: "会議期間の残り日数の見出し",
            kind: "text",
            placeholder: "空なら「閉会まで」",
            description: "例: 「12月定例会議　閉会まで 5 日」",
          },
          {
            name: "session_system_md",
            label: "制度の説明（「○○とは」ページの本文）",
            kind: "markdown",
            rows: 18,
            fullWidth: true,
            templated: true,
            description:
              "Markdown で書けます。{{council_name}} {{session_label}} {{session_system_label}} {{operator_name}} などを差し込めます",
            samples: [
              {
                label: "相模原市議会のひな形",
                value: SAGAMIHARA_SESSION_SYSTEM_MD,
              },
            ],
          },
        ],
      },
      {
        title: "審議段階の表示名",
        description: "議案の進み具合の表示。空欄にはできません。",
        fields: [
          { name: "stage_labels.preparing", label: "提出前", kind: "text" },
          { name: "stage_labels.submitted", label: "提出", kind: "text" },
          { name: "stage_labels.referred", label: "委員会付託", kind: "text" },
          {
            name: "stage_labels.in_committee",
            label: "委員会審査中",
            kind: "text",
          },
          {
            name: "stage_labels.plenary",
            label: "本会議採決待ち",
            kind: "text",
          },
          { name: "stage_labels.decided", label: "議決済み", kind: "text" },
        ],
      },
      {
        title: "議決の結果の表示名",
        fields: [
          { name: "result_labels.passed", label: "可決", kind: "text" },
          { name: "result_labels.rejected", label: "否決", kind: "text" },
          { name: "result_labels.approved", label: "承認", kind: "text" },
          { name: "result_labels.consented", label: "同意", kind: "text" },
          { name: "result_labels.adopted", label: "採択", kind: "text" },
          { name: "result_labels.not_adopted", label: "不採択", kind: "text" },
          { name: "result_labels.continued", label: "継続審査", kind: "text" },
          { name: "result_labels.withdrawn", label: "撤回", kind: "text" },
        ],
      },
    ],
  },
  {
    section: "operator",
    label: "運営者",
    description:
      "サイトを運営する議員・団体の情報。トップページとフッターに出ます。",
    groups: [
      {
        title: "プロフィール",
        fields: [
          { name: "name", label: "氏名", kind: "text" },
          {
            name: "title",
            label: "肩書き",
            kind: "text",
            placeholder: "相模原市議会議員",
          },
          {
            name: "ward",
            label: "選挙区・地域",
            kind: "text",
            placeholder: "南区",
          },
          { name: "faction", label: "会派", kind: "text" },
          {
            name: "catchphrase",
            label: "一言プロフィール",
            kind: "text",
            fullWidth: true,
          },
          {
            name: "photo_url",
            label: "写真",
            kind: "image",
            assetKind: "operator_photo",
          },
          {
            name: "affiliations",
            label: "所属委員会など",
            kind: "string-list",
            description: "1 行に 1 項目",
          },
          {
            name: "bio_md",
            label: "紹介文（Markdown）",
            kind: "markdown",
            rows: 8,
            fullWidth: true,
          },
        ],
      },
      {
        title: "連絡先",
        fields: [
          {
            name: "contact_label",
            label: "問い合わせボタンの文言",
            kind: "text",
            placeholder: "ご意見・ご要望はこちら",
          },
          {
            name: "contact_url",
            label: "問い合わせ先 URL",
            kind: "url",
            description: "フォーム・メール・LINE など",
          },
          { name: "official_site", label: "公式サイト", kind: "url" },
          {
            name: "disclaimer_md",
            label: "運営に関する注記（Markdown）",
            kind: "markdown",
            rows: 4,
            fullWidth: true,
            templated: true,
            description: `議員個人の運営であり議会公式ではない旨など。${TEMPLATE_HELP}`,
          },
        ],
      },
      {
        title: "SNS",
        fields: [],
        custom: { editor: "sns", name: "sns" },
      },
    ],
  },
  {
    section: "brand",
    label: "ブランド",
    description:
      "ブランド案・テーマ色・ロゴと画像。空欄の画像は選んだ案の同梱画像を使います。",
    groups: [
      {
        title: "ブランド案",
        description:
          "ロゴ・アイコン・OGP 画像・会期ページの帯とテーマ色のセット。切り替えてから「保存」。",
        fields: [],
        custom: { editor: "brand_preset", name: "preset" },
      },
      {
        title: "テーマ色",
        description:
          "本家「みらい議会」の色（#2aa693 / #2a5ea8）は使えません。",
        fields: [
          { name: "colors.primary", label: "メインカラー", kind: "color" },
          {
            name: "colors.primary_accent",
            label: "アクセント（濃い色）",
            kind: "color",
          },
          {
            name: "colors.gradient_start",
            label: "グラデーション開始",
            kind: "color",
          },
          {
            name: "colors.gradient_end",
            label: "グラデーション終了",
            kind: "color",
          },
          {
            name: "colors.theme_color",
            label: "ブラウザのテーマ色",
            kind: "color",
            description: "スマートフォンのアドレスバーなどの色",
          },
        ],
      },
      {
        title: "ロゴ・画像",
        fields: [
          {
            name: "logo_url",
            label: "ロゴマーク（正方形）",
            kind: "image",
            assetKind: "logo",
          },
          {
            name: "service_logo_url",
            label: "ヘッダーのロゴ（横長）",
            kind: "image",
            assetKind: "service_logo",
            description: "未設定ならサイト名をテキストで表示します",
          },
          {
            name: "ogp_image_url",
            label: "OGP 画像（1200×630）",
            kind: "image",
            assetKind: "ogp",
            description:
              "空なら、サイト名・キャッチコピー・説明をブランド案の背景の上に自動で描いた画像（/api/og/site）を使います",
          },
          {
            name: "archive_hero_url",
            label: "過去の会期ページの背景画像",
            kind: "image",
            assetKind: "archive_hero",
          },
        ],
      },
      {
        title: "アプリアイコン",
        description: "ホーム画面に追加したときのアイコン。",
        fields: [
          {
            name: "icon_192_url",
            label: "アイコン 192×192",
            kind: "image",
            assetKind: "icon_192",
          },
          {
            name: "icon_512_url",
            label: "アイコン 512×512",
            kind: "image",
            assetKind: "icon_512",
          },
          {
            name: "icon_ios_url",
            label: "iOS 用アイコン 180×180",
            kind: "image",
            assetKind: "icon_ios",
          },
        ],
      },
    ],
  },
  {
    section: "links",
    label: "リンク",
    description: "議会の公式ページや本家へのリンク。",
    groups: [
      {
        title: "議会の公式ページ",
        fields: [
          { name: "council_site", label: "議会トップ", kind: "url" },
          { name: "bills_page", label: "議案一覧", kind: "url" },
          { name: "results_page", label: "審議結果", kind: "url" },
          {
            name: "committee_results_page",
            label: "委員会の審査結果",
            kind: "url",
          },
          { name: "schedule_page", label: "会議日程", kind: "url" },
          { name: "minutes_search", label: "会議録検索", kind: "url" },
          { name: "live_stream", label: "議会中継", kind: "url" },
          { name: "petition_guide", label: "請願・陳情の案内", kind: "url" },
          {
            name: "public_comment_page",
            label: "パブリックコメント",
            kind: "url",
          },
          { name: "newsletter", label: "議会だより・広報", kind: "url" },
        ],
      },
      {
        title: "ソースコードと本家",
        description:
          "AGPL により、このサイトのソースコードの公開先は必須です。",
        fields: [
          {
            name: "fork_repo",
            label: "このサイトのソースコード（必須）",
            kind: "url",
            placeholder: "https://github.com/.../mirai-gikai-sagamihara",
          },
          { name: "upstream_repo", label: "本家リポジトリ", kind: "url" },
          {
            name: "original_service",
            label: "本家「みらい議会」",
            kind: "url",
          },
          {
            name: "fork_guidelines",
            label: "フォークガイドライン",
            kind: "url",
          },
        ],
      },
    ],
  },
  {
    section: "features",
    label: "機能",
    description:
      "公開サイトに出す機能。オフにした機能のページと API は 404 になります。",
    groups: [
      {
        title: "AI を使う機能",
        description:
          "利用者が AI と直接やり取りする機能は、この版では使えません。AI の出力が運営者の確認を経ずに利用者へ表示されるためです（掲載方針）。",
        fields: [
          {
            name: "ai_chat",
            label: "AI チャット（議案について質問）",
            kind: "boolean",
            locked: LOCKED_OFF_FEATURES.ai_chat,
          },
          {
            name: "ai_interview",
            label: "AI インタビュー（意見の聞き取り）",
            kind: "boolean",
            locked: LOCKED_OFF_FEATURES.ai_interview,
          },
          {
            name: "topic_analysis",
            label: "トピック分析（インタビュー結果の集計）",
            kind: "boolean",
            description:
              "運営者が公開した分析だけを表示します。AI インタビューが使えないため、この版では対象がありません",
          },
          {
            name: "article_reports",
            label: "記事の誤り報告（AI 自動生成版の記事向け）",
            kind: "boolean",
            description:
              "この版では AI 自動生成版の記事を公開しないため、受付欄は表示されません",
          },
        ],
      },
      {
        title: "表示する内容",
        fields: [
          {
            name: "operator_section",
            label: "運営者の紹介欄",
            kind: "boolean",
          },
          {
            name: "operator_stance",
            label: "運営者の賛否・見解",
            kind: "boolean",
          },
          { name: "faction_votes", label: "会派ごとの賛否", kind: "boolean" },
          { name: "member_votes", label: "議員ごとの賛否", kind: "boolean" },
          { name: "petitions", label: "請願・陳情の一覧", kind: "boolean" },
          { name: "past_sessions", label: "過去の会期", kind: "boolean" },
          {
            name: "schedule",
            label: "会議の予定（カレンダー）",
            kind: "boolean",
          },
          { name: "glossary", label: "用語解説", kind: "boolean" },
          { name: "pwa", label: "ホーム画面への追加（PWA）", kind: "boolean" },
        ],
      },
      {
        title: "ふりがな",
        description:
          "ふりがなは外部サービス（Rubyful）が漢字に自動で付けます。人名・地名などは読みが違うことがあります。",
        fields: [
          {
            name: "furigana",
            label: "ふりがなを使えるようにする",
            kind: "boolean",
            description:
              "オンにすると、メニューと画面右上に「ふりがな表示」の切り替えを出します。オフにすると切り替えを出さず、だれにもふりがなを表示しません",
          },
          {
            name: "furigana_default_on",
            label: "最初からふりがなを表示する",
            kind: "boolean",
            description:
              "オンにすると、まだ切り替えていない人にも最初からふりがなを表示します。見る人は自分でオフにできます（選んだ内容はその人の端末に残ります）",
          },
        ],
      },
      {
        title: "利用者からの受付",
        description:
          "届いた内容は管理画面で確認してから対応します。自動では公開されません。",
        fields: [
          {
            name: "opinion_form",
            label: "意見・要望フォーム",
            kind: "boolean",
          },
          { name: "question_form", label: "質問フォーム", kind: "boolean" },
          {
            name: "open_data_api",
            label: "オープンデータ API（開発者向け）",
            kind: "boolean",
          },
        ],
      },
    ],
  },
  {
    section: "legal",
    label: "規約・文言",
    description: "利用規約・プライバシーポリシーなど。Markdown で書けます。",
    groups: [
      {
        title: "改変の表示",
        fields: [
          {
            name: "modified_on",
            label: "本家からの改変日",
            kind: "date",
            description: "AGPL 第5条(a)。フッターに表示します",
          },
        ],
      },
      {
        title: "文言",
        description: TEMPLATE_HELP,
        fields: [
          {
            name: "disclaimer_short",
            label: "議案ページの免責（短文）",
            kind: "textarea",
            rows: 3,
            fullWidth: true,
            templated: true,
          },
          {
            name: "terms_md",
            label: "利用規約",
            kind: "markdown",
            rows: 16,
            fullWidth: true,
            templated: true,
          },
          {
            name: "privacy_md",
            label: "プライバシーポリシー",
            kind: "markdown",
            rows: 16,
            fullWidth: true,
            templated: true,
          },
          {
            name: "editorial_policy_md",
            label: "「掲載方針」ページ",
            kind: "markdown",
            rows: 16,
            fullWidth: true,
            templated: true,
            description:
              "運営者が確認したものだけを載せること、自動で集めた情報は仮の取得であること、AI の使い方を利用する方に示すページ（フッター・トップ・議案ページからリンク）。空にすると既定の文を出します",
            samples: [
              { label: "既定の文", value: DEFAULT_EDITORIAL_POLICY_MD },
            ],
          },
          {
            name: "petition_guide_md",
            label: "「議会に正式に届けるには」ページ",
            kind: "markdown",
            rows: 12,
            fullWidth: true,
            templated: true,
            description: "請願・陳情・パブリックコメントなど、正式な窓口の案内",
          },
          {
            name: "interview_consent_md",
            label: "インタビューの同意文",
            kind: "markdown",
            rows: 8,
            fullWidth: true,
            templated: true,
          },
          {
            name: "data_terms_md",
            label: "データ利用規約（開発者向け）",
            kind: "markdown",
            rows: 12,
            fullWidth: true,
            templated: true,
          },
        ],
      },
    ],
  },
  {
    section: "seo",
    label: "SEO",
    description: "検索エンジンとアクセス解析。",
    groups: [
      {
        title: "検索エンジン",
        fields: [
          {
            name: "index",
            label: "検索エンジンに登録を許可",
            kind: "boolean",
            description: "オフにすると全ページ noindex になります",
          },
          { name: "sitemap", label: "sitemap.xml を出力", kind: "boolean" },
          {
            name: "gsc_verification",
            label: "Google Search Console の確認コード",
            kind: "text",
          },
          {
            name: "analytics_id",
            label: "Google Analytics の測定 ID",
            kind: "text",
            placeholder: "G-XXXXXXXXXX",
          },
          {
            name: "noindex_paths",
            label: "noindex にするパス",
            kind: "string-list",
            description: "1 行に 1 パス（例: /developers）",
          },
        ],
      },
    ],
  },
  {
    section: "ai",
    label: "AI 生成",
    description:
      "管理画面での解説生成に使うモデルと費用上限。利用者向け AI 機能は「機能」タブで切り替えます。",
    groups: [
      {
        title: "解説の生成",
        fields: [
          {
            name: "generation_model",
            label: "モデル",
            kind: "text",
            placeholder: "anthropic/claude-sonnet-4.5",
            description: "Vercel AI Gateway のモデル名",
          },
          {
            name: "generation_prompt_version",
            label: "プロンプトのバージョン",
            kind: "text",
          },
          {
            name: "monthly_total_usd_limit",
            label: "月の費用上限（USD）",
            kind: "number",
            description: "0 で無制限",
          },
        ],
      },
    ],
  },
  {
    section: "import",
    label: "取込",
    description: "議会サイトからの議案・日程の取込元。",
    groups: [
      {
        title: "取込の既定",
        fields: [
          {
            name: "dry_run_default",
            label: "既定で試し取込（保存しない）",
            kind: "boolean",
          },
          {
            name: "min_rows_ratio",
            label: "件数の下限（前回比）",
            kind: "number",
            description: "取れた件数がこの割合未満なら取込を止めます（0〜1）",
          },
          {
            name: "minutes_tenant",
            label: "会議録検索のテナント名",
            kind: "text",
            placeholder: "sagamihara",
            description: "kaigiroku.net の URL に含まれる名前",
          },
        ],
      },
      {
        title: "会議予定の取得（仮登録）",
        description:
          "議会サイトのカレンダーから会議予定を読み、管理画面「会議予定」に仮登録します。公開サイトに出るのは、運営者が確認して公開したものだけです。",
        fields: [
          {
            name: "calendar_auto_fetch",
            label: "毎日自動で取得して仮登録する",
            kind: "boolean",
            description:
              "朝 6 時ごろ（日本時間）に今月から 3 か月分を読みます。admin の Vercel に CRON_SECRET が必要です",
          },
          {
            name: "calendar_month_url",
            label: "カレンダーの月のページの URL",
            kind: "text",
            fullWidth: true,
            placeholder: "https://www.sagamihara-shigikai.jp/top/{yyyy}/{mm}/",
            description:
              "{yyyy} に年、{mm} に月（2 桁）を差し込みます。空なら「議会の公式サイト」の URL から作ります（相模原市議会の形）",
          },
        ],
      },
      {
        title: "取込元",
        fields: [],
        custom: { editor: "import_sources", name: "sources" },
      },
    ],
  },
];

export function getSectionDefinition(
  section: SiteSettingsSection
): SectionDefinition {
  const definition = SECTION_DEFINITIONS.find((d) => d.section === section);
  if (!definition) {
    throw new Error(`Unknown section: ${section}`);
  }
  return definition;
}
