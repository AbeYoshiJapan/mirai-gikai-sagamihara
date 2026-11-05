"use client";

import {
  brandAsset,
  splitSiteName,
} from "@mirai-gikai/shared/site-settings/public";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { sendDifficultyStateEvent } from "@/lib/analytics/preference-state-events";
import { useOnPageView } from "@/lib/analytics/use-on-page-view";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { useSiteSettings } from "@/lib/site-settings/provider";
import { cn } from "@/lib/utils";
import { HamburgerMenu } from "./hamburger-menu";
import { siteNameSizeClass } from "./site-name-size";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  const { site, brand } = useSiteSettings();
  const siteName = splitSiteName(site.name);
  const showDifficultySelector = isMainPage(pathname);
  const showInterviewActions = isInterviewPage(pathname);

  // Headerは1ページに1つだけ常時マウントされるため、
  // ここで難易度設定をページ表示のたびにGAへ送る
  // (DifficultySelectorはmarkdown埋め込み等で複数箇所に
  //  同時マウントされ得るため、送信元には適さない)
  useOnPageView(() => sendDifficultyStateEvent(difficultyLevel));

  return (
    <header className="px-3 fixed top-4 left-0 right-0 z-40 max-w-[1440px] mx-auto">
      <div className="rounded-2xl bg-white shadow-sm mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo / Site Title。サイト名の下にキャッチコピー（スマホでも出す） */}
          <div className="flex min-w-0 flex-1 items-center">
            <Link
              href={routes.home()}
              className="flex min-w-0 items-center gap-2"
              aria-label="ホーム"
            >
              <Image
                src={brandAsset(brand, "logo_url")}
                alt={site.name}
                width={40}
                height={36}
                unoptimized
                className="shrink-0"
              />
              {brand.service_logo_url ? (
                <Image
                  src={brand.service_logo_url}
                  alt={site.name}
                  width={151}
                  height={24}
                  unoptimized
                />
              ) : (
                <span className="flex min-w-0 flex-col justify-center">
                  {/*
                    keep-all で文字の途中では折り返さず、「＠」の手前（<wbr>）だけで折り返す。
                    それでも入らない長い名前は anywhere で収まる位置から 2 行目に送る。
                  */}
                  <span
                    className={cn(
                      "font-extrabold leading-tight text-black [overflow-wrap:anywhere] [word-break:keep-all]",
                      siteNameSizeClass(site.name)
                    )}
                  >
                    {siteName.base}
                    {siteName.suffix && (
                      <>
                        <wbr />
                        <span className="whitespace-nowrap text-primary">
                          {siteName.suffix}
                        </span>
                      </>
                    )}
                  </span>
                  {site.tagline && (
                    <span className="mt-0.5 line-clamp-1 text-[10px] font-bold leading-snug text-mirai-text-secondary sm:text-[11px]">
                      {site.tagline}
                    </span>
                  )}
                </span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav
            className="flex shrink-0 items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector currentLevel={difficultyLevel} compact />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <HamburgerMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
