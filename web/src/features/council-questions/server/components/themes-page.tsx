import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getPublicThemes } from "../loaders/council-question-loaders";

/** テーマ（関心ごと）の一覧。運営者がテーマとして公開したものだけ */
export async function ThemesPage() {
  const themes = await getPublicThemes();

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "テーマ" },
          ]}
        />
      </div>
      <h1 className="mb-3 text-3xl font-bold">テーマ</h1>
      <p className="mb-8 text-sm leading-6 text-mirai-text-secondary">
        関心のあるテーマごとに、議案と議会での質問をまとめて見られます。ひも付けは運営者が行っています。
      </p>
      {themes.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-6 text-sm text-mirai-text-secondary">
          まだテーマはありません。
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {themes.map((theme) => (
            <li key={theme.id}>
              <Link
                href={routes.themeDetail(theme.id) as Route}
                className="block h-full rounded-2xl bg-white px-5 py-4 hover:bg-mirai-surface-light"
              >
                <div className="text-lg font-bold">{theme.label}</div>
                {theme.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-mirai-text-secondary">
                    {theme.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-mirai-text-secondary">
                  議案 {theme.billCount} 件・議会での質問 {theme.questionCount}{" "}
                  件
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
