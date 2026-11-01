import { z } from "zod";

/**
 * サイト設定のスキーマ。
 *
 * 設定は DB の site_settings テーブルに「セクション名 → JSON」の形で保存し、
 * web と admin の両方がこのスキーマで検証して読む。
 * コードに自治体名・運営者名・色・リンクをベタ書きしないための唯一の入口。
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "色は #RRGGBB 形式で入力してください");

/** 空文字を許す URL（未設定を "" で表す） */
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//.test(v), {
    message: "http(s):// から始まる URL を入力してください",
  });

const shortText = (max: number) => z.string().trim().max(max);

export const siteSectionSchema = z.object({
  /** サイト名。フォークガイドラインの形式は「みらい議会＠地域名」 */
  name: shortText(60),
  /** ロゴ横の一行（例: 相模原市議会の議論をわかりやすく） */
  tagline: shortText(120),
  /** メタ説明文・OGP の説明 */
  description: shortText(300),
  /** 本番 URL（sitemap・canonical・OGP に使う）。空なら環境変数の値 */
  canonical_url: optionalUrl,
  timezone: z.string().default("Asia/Tokyo"),
  /** false の間は公開サイトを「準備中」にする */
  published: z.boolean().default(false),
  /** 初期設定ウィザードを完了したか */
  setup_completed: z.boolean().default(false),
});

export const snsLinkSchema = z.object({
  name: shortText(40),
  url: optionalUrl,
  /** /icons/sns/ 配下のアイコン名（x, instagram, youtube, line, tiktok, facebook, note, threads, web） */
  icon: shortText(40),
});

export const operatorSectionSchema = z.object({
  name: shortText(60),
  /** 肩書き（例: 相模原市議会議員） */
  title: shortText(60),
  /** 選挙区・地域（例: 南区） */
  ward: shortText(40),
  /** 一言プロフィール（例: ○○に取り組む市議） */
  catchphrase: shortText(80),
  photo_url: optionalUrl,
  bio_md: z.string().max(4000),
  faction: shortText(60),
  /** 所属委員会など、箇条書きで出す項目 */
  affiliations: z.array(shortText(80)).max(10),
  sns: z.array(snsLinkSchema).max(10),
  /** 問い合わせ先（フォーム・メール・LINE など） */
  contact_label: shortText(60),
  contact_url: optionalUrl,
  official_site: optionalUrl,
  /** 「議員個人の運営で公式サイトではない」旨の文言 */
  disclaimer_md: z.string().max(2000),
});

export const brandColorsSchema = z.object({
  primary: hexColor,
  primary_accent: hexColor,
  gradient_start: hexColor,
  gradient_end: hexColor,
  theme_color: hexColor,
});

export const brandSectionSchema = z.object({
  /** 空なら public/ 配下の既定画像を使う */
  logo_url: optionalUrl,
  service_logo_url: optionalUrl,
  ogp_image_url: optionalUrl,
  archive_hero_url: optionalUrl,
  icon_192_url: optionalUrl,
  icon_512_url: optionalUrl,
  icon_ios_url: optionalUrl,
  colors: brandColorsSchema,
});

export const linksSectionSchema = z.object({
  council_site: optionalUrl,
  minutes_search: optionalUrl,
  live_stream: optionalUrl,
  bills_page: optionalUrl,
  results_page: optionalUrl,
  committee_results_page: optionalUrl,
  schedule_page: optionalUrl,
  newsletter: optionalUrl,
  public_comment_page: optionalUrl,
  /** 議会の請願・陳情の案内ページ */
  petition_guide: optionalUrl,
  /** 本家「みらい議会」 */
  original_service: optionalUrl,
  /** 本家リポジトリ */
  upstream_repo: optionalUrl,
  /** このサイト自身のソースコード（AGPL 第13条。必須） */
  fork_repo: optionalUrl,
  fork_guidelines: optionalUrl,
});

export const committeeKindSchema = z.enum([
  "standing",
  "special",
  "steering",
  "budget",
  "settlement",
  "other",
]);

export const committeeSchema = z.object({
  name: shortText(60),
  short_name: shortText(20),
  kind: committeeKindSchema,
  sort: z.number().int().min(0).max(999),
  is_active: z.boolean(),
});

/** bills.status の表示ラベル（web のカード・進捗・管理画面） */
export const statusLabelsSchema = z.object({
  preparing: shortText(20),
  introduced: shortText(20),
  in_originating_house: shortText(20),
  in_receiving_house: shortText(20),
  enacted: shortText(20),
  rejected: shortText(20),
  reported: shortText(20),
  plan: shortText(20),
  special_committee: shortText(20),
});

export const councilSectionSchema = z.object({
  /** 議会名（例: 相模原市議会） */
  name: shortText(60),
  /** 自治体名（例: 相模原市） */
  municipality: shortText(60),
  kind: z.enum(["city", "ward", "town", "village", "prefecture"]),
  /** 通年議会か定例会制か */
  session_model: z.enum(["year_round", "regular"]),
  /** 会期（議会年度）の開始月日 */
  year_start_month: z.number().int().min(1).max(12),
  year_start_day: z.number().int().min(1).max(31),
  /** 会議期間の呼び方（例: 定例会議、○月議会） */
  session_label: shortText(20),
  /** 住民の呼称（例: 市民） */
  resident_label: shortText(10),
  /** 「区議会・区政」のような説明に使う短い呼称（例: 市議会・市政） */
  scope_label: shortText(20),
  /** 会議録検索など一次資料の総称 */
  primary_source_label: shortText(40),
  committees: z.array(committeeSchema).max(30),
  status_labels: statusLabelsSchema,
  /** 審議中ステータスのカード表示（例: 市議会審議中） */
  in_progress_label: shortText(20),
});

export const aiSectionSchema = z.object({
  /** 管理画面の解説生成に使うモデル（AI Gateway のモデル文字列） */
  generation_model: shortText(80),
  generation_prompt_version: shortText(20),
  /** 生成コストの月次上限（USD）。0 は無制限 */
  monthly_total_usd_limit: z.number().min(0).max(100000),
});

export const importSourceSchema = z.object({
  id: shortText(40),
  adapter: shortText(60),
  url: optionalUrl,
  enabled: z.boolean(),
  /** cron 式（空なら手動のみ） */
  schedule: shortText(60),
});

export const importSectionSchema = z.object({
  sources: z.array(importSourceSchema).max(20),
  dry_run_default: z.boolean(),
  /** 取れた件数が前回のこの割合未満なら取込を止める */
  min_rows_ratio: z.number().min(0).max(1),
  /** kaigiroku.net のテナント名 */
  minutes_tenant: shortText(40),
});

export const featuresSectionSchema = z.object({
  ai_chat: z.boolean(),
  ai_interview: z.boolean(),
  topic_analysis: z.boolean(),
  furigana: z.boolean(),
  operator_stance: z.boolean(),
  faction_votes: z.boolean(),
  member_votes: z.boolean(),
  petitions: z.boolean(),
  open_data_api: z.boolean(),
  past_sessions: z.boolean(),
  schedule: z.boolean(),
  operator_section: z.boolean(),
  pwa: z.boolean(),
  article_reports: z.boolean(),
  glossary: z.boolean(),
  opinion_form: z.boolean(),
  question_form: z.boolean(),
});

export const legalSectionSchema = z.object({
  terms_md: z.string().max(40000),
  privacy_md: z.string().max(40000),
  /** 議案詳細の下に出す短い免責 */
  disclaimer_short: z.string().max(1000),
  interview_consent_md: z.string().max(8000),
  data_terms_md: z.string().max(40000),
  /** 「議会に正式に届けるには」ページの本文 */
  petition_guide_md: z.string().max(20000),
  /** 本家からの改変日（AGPL 第5条(a)）。YYYY-MM-DD */
  modified_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal("")),
});

export const seoSectionSchema = z.object({
  index: z.boolean(),
  sitemap: z.boolean(),
  gsc_verification: shortText(120),
  analytics_id: shortText(40),
  noindex_paths: z.array(shortText(120)).max(50),
});

export const siteSettingsSchema = z.object({
  site: siteSectionSchema,
  operator: operatorSectionSchema,
  brand: brandSectionSchema,
  links: linksSectionSchema,
  council: councilSectionSchema,
  ai: aiSectionSchema,
  import: importSectionSchema,
  features: featuresSectionSchema,
  legal: legalSectionSchema,
  seo: seoSectionSchema,
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type SiteSettingsSection = keyof SiteSettings;
export type SiteSection = z.infer<typeof siteSectionSchema>;
export type OperatorSection = z.infer<typeof operatorSectionSchema>;
export type BrandSection = z.infer<typeof brandSectionSchema>;
export type BrandColors = z.infer<typeof brandColorsSchema>;
export type LinksSection = z.infer<typeof linksSectionSchema>;
export type CouncilSection = z.infer<typeof councilSectionSchema>;
export type Committee = z.infer<typeof committeeSchema>;
export type StatusLabels = z.infer<typeof statusLabelsSchema>;
export type AiSection = z.infer<typeof aiSectionSchema>;
export type ImportSection = z.infer<typeof importSectionSchema>;
export type FeaturesSection = z.infer<typeof featuresSectionSchema>;
export type FeatureFlag = keyof FeaturesSection;
export type LegalSection = z.infer<typeof legalSectionSchema>;
export type SeoSection = z.infer<typeof seoSectionSchema>;

export const SITE_SETTINGS_SECTIONS = [
  "site",
  "operator",
  "brand",
  "links",
  "council",
  "ai",
  "import",
  "features",
  "legal",
  "seo",
] as const satisfies readonly SiteSettingsSection[];

export const SECTION_SCHEMAS = {
  site: siteSectionSchema,
  operator: operatorSectionSchema,
  brand: brandSectionSchema,
  links: linksSectionSchema,
  council: councilSectionSchema,
  ai: aiSectionSchema,
  import: importSectionSchema,
  features: featuresSectionSchema,
  legal: legalSectionSchema,
  seo: seoSectionSchema,
} as const;

/**
 * フォークガイドライン必須の免責文言。設定で変えられない。
 */
export const FORK_NOTICE = "これは政党チームみらいが運営しているものではありません";
