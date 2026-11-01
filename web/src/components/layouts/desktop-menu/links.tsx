"use client";

import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { useSiteSettings } from "@/lib/site-settings/provider";

type FooterLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

/**
 * デスクトップメニュー: フッターリンク（サイドバー内）
 */
export function DesktopMenuLinks() {
  const { links: siteLinks, operator } = useSiteSettings();
  const links: FooterLinkItem[] = [
    { label: "利用規約", href: routes.terms(), external: false },
    { label: "プライバシーポリシー", href: routes.privacy(), external: false },
    {
      label: "議会に正式に届けるには",
      href: routes.petitionGuide(),
      external: false,
    },
  ];
  if (siteLinks.original_service) {
    links.push({
      label: "本家「みらい議会」（チームみらい）",
      href: siteLinks.original_service,
      external: true,
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href as Route}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noreferrer" : undefined}
          className="font-medium text-xs transition-opacity hover:opacity-70"
          style={{
            lineHeight: "1.48em",
          }}
        >
          {link.label}
        </Link>
      ))}
      <p
        className="font-medium text-xs"
        style={{
          lineHeight: "1.48em",
        }}
      >
        © 2025 Team Mirai（原作）／改変：{operator.name}
      </p>
    </div>
  );
}
