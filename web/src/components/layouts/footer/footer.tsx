"use client";

import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import { FORK_NOTICE } from "@mirai-gikai/shared/site-settings/schema";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isInterviewPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { useSiteSettings } from "@/lib/site-settings/provider";
import { buildPolicyLinks, buildPrimaryLinks } from "./footer.config";

export function Footer() {
  const pathname = usePathname();

  if (isInterviewPage(pathname)) {
    return null;
  }

  return (
    <footer className="bg-mirai-gradient text-slate-900">
      <div className="mx-auto flex w-full max-w-[500px] flex-col items-center px-6 py-14 pb-20 text-center">
        <FooterLogoSection />
        <FooterPrimaryLinks />
        <FooterPolicies />
        <FooterCopyright />
      </div>
    </footer>
  );
}

function FooterLogoSection() {
  const { site, brand } = useSiteSettings();
  return (
    <div className="flex flex-col items-center text-center mb-9">
      <Link href={routes.home()} aria-label={`${site.name} トップページ`}>
        <Image
          src={brandAsset(brand, "logo_url")}
          alt={site.name}
          width={150}
          height={128}
          className="h-auto"
          unoptimized
        />
      </Link>
    </div>
  );
}

function FooterPrimaryLinks() {
  const settings = useSiteSettings();
  const primaryLinks = buildPrimaryLinks(settings);
  return (
    <nav aria-label="主要リンク" className="w-full mb-5">
      <ul
        className="
      flex flex-col items-center gap-3 text-[14px] font-semibold text-slate-800
      md:flex-row md:justify-center md:gap-5
      "
      >
        {primaryLinks.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href as Route}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterPolicies() {
  const settings = useSiteSettings();
  const policyLinks = buildPolicyLinks(settings);
  return (
    <div className="flex flex-col items-center text-[12px] font-semibold text-slate-800 mb-5">
      <ul className="flex flex-wrap justify-center gap-x-2 gap-y-1">
        {policyLinks.map((policy, index) => (
          <li key={policy.label} className="flex items-center gap-2">
            <Link
              href={policy.href as Route}
              target={policy.external ? "_blank" : undefined}
              rel={policy.external ? "noreferrer" : undefined}
              className="transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {policy.label}
            </Link>
            {index < policyLinks.length - 1 ? <span>｜</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterCopyright() {
  const { site, operator, legal } = useSiteSettings();
  const modifiedOn = legal.modified_on;
  return (
    <div className="text-center text-sm font-medium text-slate-800">
      <p className="mb-3 text-xs">{FORK_NOTICE}</p>
      <p className="text-xs">
        本サイトは「みらい議会」（AGPL-3.0）を改変したものです
        {modifiedOn ? `（${modifiedOn}改変）` : ""}
      </p>
      <p className="mt-3 text-xs">
        {site.name}（運営：{operator.name}）
      </p>
    </div>
  );
}
