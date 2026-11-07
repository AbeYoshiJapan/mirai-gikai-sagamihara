import {
  type BrandAssetKey,
  type BrandAssetPaths,
  BRAND_PRESETS,
  DEFAULT_BRAND_PRESET_ID,
  isBrandPresetId,
} from "./brand-presets";
import type { SiteSettings } from "./schema";

import { DEFAULT_EDITORIAL_POLICY_MD, renderTemplate } from "./templates";

export type { BrandAssetKey } from "./brand-presets";

/**
 * 公開サイトのクライアントコンポーネントに渡してよい部分。
 * 取込設定・AI 設定・SEO の検証タグなどは含めない（クライアントの JS に載せない）。
 */
export type PublicSiteSettings = {
  site: Pick<
    SiteSettings["site"],
    "name" | "tagline" | "description" | "published"
  >;
  operator: Pick<
    SiteSettings["operator"],
    | "name"
    | "title"
    | "ward"
    | "catchphrase"
    | "photo_url"
    | "faction"
    | "name_in_council"
    | "affiliations"
    | "sns"
    | "contact_label"
    | "contact_url"
    | "official_site"
  >;
  brand: SiteSettings["brand"];
  links: SiteSettings["links"];
  council: Pick<
    SiteSettings["council"],
    | "name"
    | "municipality"
    | "session_model"
    | "session_label"
    | "session_system_label"
    | "session_system_summary"
    | "resident_label"
    | "scope_label"
    | "primary_source_label"
    | "stage_labels"
    | "result_labels"
    | "in_progress_label"
    | "carried_over_label"
    | "upcoming_label"
  >;
  features: SiteSettings["features"];
  legal: Pick<SiteSettings["legal"], "modified_on">;
};

export function toPublicSiteSettings(s: SiteSettings): PublicSiteSettings {
  return {
    site: {
      name: s.site.name,
      tagline: s.site.tagline,
      description: s.site.description,
      published: s.site.published,
    },
    operator: {
      name: s.operator.name,
      title: s.operator.title,
      ward: s.operator.ward,
      catchphrase: s.operator.catchphrase,
      photo_url: s.operator.photo_url,
      faction: s.operator.faction,
      name_in_council: s.operator.name_in_council,
      affiliations: s.operator.affiliations,
      sns: s.operator.sns,
      contact_label: s.operator.contact_label,
      contact_url: s.operator.contact_url,
      official_site: s.operator.official_site,
    },
    brand: s.brand,
    links: s.links,
    council: {
      name: s.council.name,
      municipality: s.council.municipality,
      session_model: s.council.session_model,
      session_label: s.council.session_label,
      session_system_label: s.council.session_system_label,
      session_system_summary: s.council.session_system_summary,
      resident_label: s.council.resident_label,
      scope_label: s.council.scope_label,
      primary_source_label: s.council.primary_source_label,
      stage_labels: s.council.stage_labels,
      result_labels: s.council.result_labels,
      in_progress_label: s.council.in_progress_label,
      carried_over_label: s.council.carried_over_label,
      upcoming_label: s.council.upcoming_label,
    },
    features: s.features,
    legal: { modified_on: s.legal.modified_on },
  };
}

/** 規約類のテンプレートに差し込む値 */
export function templateValues(s: SiteSettings): Record<string, string> {
  return {
    site_name: s.site.name,
    operator_name: s.operator.name,
    operator_title: s.operator.title,
    council_name: s.council.name,
    municipality: s.council.municipality,
    contact_label: s.operator.contact_label || "お問い合わせ窓口",
    contact_url: s.operator.contact_url,
    primary_source_label: s.council.primary_source_label,
    session_label: s.council.session_label,
    session_system_label: s.council.session_system_label,
    modified_on: s.legal.modified_on || "未設定",
  };
}

/** 設定の Markdown 文面をテンプレート展開して返す */
export function renderLegalText(
  s: SiteSettings,
  key: keyof SiteSettings["legal"]
): string {
  return renderTemplate(s.legal[key], templateValues(s));
}

/**
 * 「掲載方針」ページの本文（テンプレート展開済み）。
 * AI・自動収集の扱いを示す大事な文面なので、設定が空でも既定文を出す。
 */
export function renderEditorialPolicy(s: SiteSettings): string {
  const text = s.legal.editorial_policy_md.trim()
    ? s.legal.editorial_policy_md
    : DEFAULT_EDITORIAL_POLICY_MD;
  return renderTemplate(text, templateValues(s));
}

/**
 * 会期の制度（通年議会など）の説明ページを出すか。
 * 制度名が空なら、トップの制度表示・説明ページ・各所のリンクを出さない。
 */
export function hasSessionSystemPage(
  council: Pick<SiteSettings["council"], "session_system_label">
): boolean {
  return council.session_system_label.trim() !== "";
}

/** 会期の制度の説明本文（テンプレート展開済み） */
export function renderSessionSystemText(s: SiteSettings): string {
  return renderTemplate(s.council.session_system_md, templateValues(s));
}

export type CouncilWording = {
  /** 会議期間の呼称（例: 定例会議） */
  sessionLabel: string;
  /** 会議期間の外の日の表示（例: 会期中（定例会議の間）、閉会中） */
  outOfPeriod: string;
  /** 次の会議期間までの日数の見出し（例: 開会まで） */
  countdownOpen: string;
  /** 会議期間の残り日数の見出し（例: 閉会まで） */
  countdownClose: string;
};

/**
 * 議会カード・会議予定ページの文言。設定が空なら session_model から自動で決める。
 * 通年議会（相模原市議会）では定例会議の間も会期は続いているので「閉会中」とは出さない。
 */
export function councilWording(
  council: Pick<
    SiteSettings["council"],
    | "session_model"
    | "session_label"
    | "out_of_period_label"
    | "countdown_open_label"
    | "countdown_close_label"
  >
): CouncilWording {
  const sessionLabel = council.session_label.trim() || "定例会";
  const yearRound = council.session_model === "year_round";
  return {
    sessionLabel,
    outOfPeriod:
      council.out_of_period_label.trim() ||
      (yearRound ? `会期中（${sessionLabel}の間）` : "閉会中"),
    countdownOpen: council.countdown_open_label.trim() || "開会まで",
    countdownClose: council.countdown_close_label.trim() || "閉会まで",
  };
}

/** サイト名の由来（テンプレート展開済み）。空なら "" */
export function renderSiteNameNote(s: SiteSettings): string {
  return renderTemplate(s.site.name_note_md, templateValues(s)).trim();
}

/** 運営者の免責文（テンプレート展開済み） */
export function renderOperatorDisclaimer(s: SiteSettings): string {
  return renderTemplate(s.operator.disclaimer_md, templateValues(s));
}

/**
 * public/ 配下の既定画像。設定が空で、ブランド案も custom のときに使う
 * （= 案1「かけはし」の同梱画像）
 */
export const DEFAULT_BRAND_ASSETS: BrandAssetPaths =
  BRAND_PRESETS[DEFAULT_BRAND_PRESET_ID].assets;

/** 設定値が空なら、選んでいるブランド案の同梱画像のパスを返す */
export function brandAsset(
  brand: SiteSettings["brand"],
  key: BrandAssetKey
): string {
  const value = brand[key];
  if (value && value.length > 0) return value;
  if (isBrandPresetId(brand.preset)) {
    return BRAND_PRESETS[brand.preset].assets[key];
  }
  return DEFAULT_BRAND_ASSETS[key];
}

/**
 * サイト名を「みらい議会」と「＠相模原市」に分ける（ヘッダーで後半だけ色を変える）。
 * ＠ / @ が無ければ suffix は空。
 */
export function splitSiteName(name: string): { base: string; suffix: string } {
  const index = name.search(/[＠@]/);
  if (index <= 0) return { base: name, suffix: "" };
  return { base: name.slice(0, index), suffix: name.slice(index) };
}

/** テーマ色を CSS 変数の宣言にする（RootLayout の <style> に入れる） */
export function brandColorsToCss(colors: SiteSettings["brand"]["colors"]): string {
  // globals.css の :root 宣言より後に読まれる保証がないので !important で勝たせる
  return [
    `--primary: ${colors.primary} !important;`,
    `--primary-accent: ${colors.primary_accent} !important;`,
    `--color-mirai-gradient-start: ${colors.gradient_start} !important;`,
    `--color-mirai-gradient-end: ${colors.gradient_end} !important;`,
  ].join(" ");
}
