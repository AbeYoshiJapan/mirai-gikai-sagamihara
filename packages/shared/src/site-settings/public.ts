import type { SiteSettings } from "./schema";
import { renderTemplate } from "./templates";

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
    | "session_label"
    | "resident_label"
    | "scope_label"
    | "primary_source_label"
    | "status_labels"
    | "in_progress_label"
    | "committees"
  >;
  features: SiteSettings["features"];
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
      session_label: s.council.session_label,
      resident_label: s.council.resident_label,
      scope_label: s.council.scope_label,
      primary_source_label: s.council.primary_source_label,
      status_labels: s.council.status_labels,
      in_progress_label: s.council.in_progress_label,
      committees: s.council.committees,
    },
    features: s.features,
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

/** 運営者の免責文（テンプレート展開済み） */
export function renderOperatorDisclaimer(s: SiteSettings): string {
  return renderTemplate(s.operator.disclaimer_md, templateValues(s));
}

/** public/ 配下の既定画像。設定が空のときに使う */
export const DEFAULT_BRAND_ASSETS = {
  logo_url: "/img/logo.svg",
  service_logo_url: "/img/service-logo.svg",
  ogp_image_url: "/ogp.jpg",
  hero_image_url: "/img/hero_background.png",
  archive_hero_url: "/img/archive-hero.png",
  icon_192_url: "/icons/pwa/icon_android_192.png",
  icon_512_url: "/icons/pwa/icon_android_512.png",
  icon_ios_url: "/icons/pwa/icon_ios.png",
} as const;

export type BrandAssetKey = keyof typeof DEFAULT_BRAND_ASSETS;

/** 設定値が空なら既定の画像パスを返す */
export function brandAsset(
  brand: SiteSettings["brand"],
  key: BrandAssetKey
): string {
  const value = brand[key];
  return value && value.length > 0 ? value : DEFAULT_BRAND_ASSETS[key];
}

/** テーマ色を CSS 変数の宣言にする（RootLayout の <style> に入れる） */
export function brandColorsToCss(colors: SiteSettings["brand"]["colors"]): string {
  return [
    `--primary: ${colors.primary};`,
    `--primary-accent: ${colors.primary_accent};`,
    `--mirai-gradient-start: ${colors.gradient_start};`,
    `--mirai-gradient-end: ${colors.gradient_end};`,
  ].join(" ");
}
