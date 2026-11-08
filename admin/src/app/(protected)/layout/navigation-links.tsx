"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navigationLinks: {
  href: string;
  label: string;
  /** 複数のパスで同じ項目を選択状態にするときの接頭辞 */
  activePrefixes?: string[];
}[] = [
  { href: routes.bills(), label: "議案管理" },
  { href: routes.dietSessions(), label: "会期管理" },
  { href: routes.councilMeetings(), label: "会議予定" },
  { href: routes.councilQuestions(), label: "議会での質問" },
  { href: routes.committees(), label: "委員会" },
  { href: routes.importPage(), label: "取込" },
  { href: routes.tags(), label: "タグ管理" },
  { href: routes.interviews(), label: "インタビュー" },
  // 全議案トピック分析(/user-topic-analysis)は隠し機能のためヘッダーに出さない（URL直アクセスのみ）。
  { href: routes.experts(), label: "有識者" },
  {
    href: routes.readerOpinions(),
    label: "意見・質問",
    activePrefixes: [routes.readerOpinions(), routes.readerQuestions()],
  },
  { href: routes.pr(), label: "PR・広報" },
  { href: routes.admins(), label: "管理者" },
  { href: routes.settings(), label: "サイト設定" },
];

export function NavigationLinks() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto">
      {/* 項目が増えても名前が折り返さないよう、幅が足りなければ横にスクロールする */}
      <div className="flex gap-x-6">
        {navigationLinks.map((link) => {
          const isActive = (link.activePrefixes ?? [link.href]).some((prefix) =>
            pathname.startsWith(prefix)
          );

          return (
            <Link
              key={link.href}
              href={link.href as Route}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-1 py-4 text-sm border-b-2 transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium"
              )}
            >
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
