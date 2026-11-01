import type { PublicSiteSettings } from "@mirai-gikai/shared/site-settings/public";
import { routes } from "@/lib/routes";

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterPolicyLink = FooterLink;

/**
 * フッターの主要リンク。ソースコード公開先（AGPL 第13条）と本家へのリンクは
 * サイト設定の URL が入っているときだけ出す。
 */
export function buildPrimaryLinks(settings: PublicSiteSettings): FooterLink[] {
  const links: FooterLink[] = [{ label: "TOP", href: routes.home() }];
  if (settings.links.fork_repo) {
    links.push({
      label: "ソースコード",
      href: settings.links.fork_repo,
      external: true,
    });
  }
  if (settings.links.original_service) {
    links.push({
      label: "本家「みらい議会」",
      href: settings.links.original_service,
      external: true,
    });
  }
  if (settings.links.council_site) {
    links.push({
      label: settings.council.name,
      href: settings.links.council_site,
      external: true,
    });
  }
  return links;
}

export function buildPolicyLinks(
  settings: PublicSiteSettings
): FooterPolicyLink[] {
  const links: FooterPolicyLink[] = [
    { label: "利用規約", href: routes.terms() },
    { label: "プライバシーポリシー", href: routes.privacy() },
    { label: "議会に正式に届けるには", href: routes.petitionGuide() },
  ];
  if (settings.features.open_data_api) {
    links.push({ label: "開発者向け", href: routes.developers() });
  }
  return links;
}
