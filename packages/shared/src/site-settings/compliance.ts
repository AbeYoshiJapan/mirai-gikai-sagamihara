import type { SiteSettings } from "./schema";

/**
 * フォークガイドライン（本家 FORK_GUIDELINES.md）と AGPL の要件のうち、
 * 設定値から機械的に確かめられるものを点検する。
 * 管理画面の「サイト設定」ヘッダーと初期設定ウィザードの最終ステップで使う。
 */

export type ComplianceLevel = "error" | "warning";

export type ComplianceIssue = {
  level: ComplianceLevel;
  /** 設定画面のタブ */
  section: keyof SiteSettings;
  message: string;
};

/** 本家「みらい議会」のテーマ色。フォークはこの色を使ってはいけない */
export const UPSTREAM_PRIMARY_COLORS = ["#2aa693", "#2a5ea8"] as const;

/** 「みらい議会」の名称を使うときに求められる形式（フォークガイドライン 必須要件 1） */
const MIRAI_GIKAI_NAME_PATTERN = /^みらい議会[＠@].+/;

/**
 * サイト名がフォークガイドラインに合うか。
 * 「みらい議会」の名称を使う場合だけ「みらい議会＠地域名」の形式が必須で、
 * 独自のサービス名（「みらい議会」を含まない名前）は形式を問わない。
 */
export function usesMiraiGikaiName(name: string): boolean {
  return name.includes("みらい議会");
}

export function isSiteNameCompliant(name: string): boolean {
  return !usesMiraiGikaiName(name) || MIRAI_GIKAI_NAME_PATTERN.test(name);
}

export function checkForkCompliance(
  settings: SiteSettings
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const { site, brand, links, legal } = settings;

  if (!isSiteNameCompliant(site.name)) {
    issues.push({
      level: "error",
      section: "site",
      message:
        "「みらい議会」の名称を使うサイト名は「みらい議会＠地域名」の形式にしてください（フォークガイドライン）。独自の名前にする場合は形式は問いません",
    });
  }
  if (/[○〇]{2}/.test(site.name)) {
    issues.push({
      level: "error",
      section: "site",
      message: "サイト名が既定値のままです。地域名を入れてください",
    });
  }

  const primary = brand.colors.primary.toLowerCase();
  if (UPSTREAM_PRIMARY_COLORS.includes(primary as "#2aa693" | "#2a5ea8")) {
    issues.push({
      level: "error",
      section: "brand",
      message:
        "テーマ色が本家「みらい議会」と同じです。別の色に変えてください（フォークガイドライン）",
    });
  }

  if (!links.fork_repo) {
    issues.push({
      level: "error",
      section: "links",
      message:
        "このサイトのソースコード公開先 URL が未設定です（AGPL 第13条：利用者にソースを提供する義務）",
    });
  }

  if (!legal.modified_on) {
    issues.push({
      level: "warning",
      section: "legal",
      message:
        "本家からの改変日が未設定です（AGPL 第5条(a)：改変した旨と日付の表示）",
    });
  }

  if (!site.canonical_url) {
    issues.push({
      level: "warning",
      section: "site",
      message:
        "本番 URL が未設定です。sitemap・OGP・canonical は環境変数の URL で代用されます",
    });
  }

  if (!settings.operator.name) {
    issues.push({
      level: "warning",
      section: "operator",
      message: "運営者名が未設定です。フッターと運営者欄が空になります",
    });
  }

  return issues;
}

export function hasComplianceErrors(issues: readonly ComplianceIssue[]) {
  return issues.some((issue) => issue.level === "error");
}
