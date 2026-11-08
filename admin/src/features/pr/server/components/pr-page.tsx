import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { PrDraftCard } from "../../client/components/pr-draft-card";
import { prLogKey } from "../../shared/utils/pr-drafts";
import { loadPrPage } from "../loaders/load-pr-page";

/**
 * PR・広報：公開中の情報から X 投稿の下書きを作る。
 * 投稿は運営者が自分のアカウントで行う（自動投稿はしない）。
 */
export async function PrPage() {
  const { sections, logsByKey, logsReady, hashtags, baseUrl } =
    await loadPrPage();

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">PR・広報</h1>
        <p className="text-sm text-gray-600">
          公開中の議案・会議の予定・議会での質問・皆さんとのやりとりから、X
          に投稿する文の下書きを作ります。文を直してから「X
          で投稿する」を押すと、X
          の投稿画面が開きます。投稿するのは運営者ご本人で、このサイトから自動で投稿することはありません。
        </p>
      </div>

      <div className="space-y-1 rounded-lg border bg-white p-4 text-sm">
        <p>
          ハッシュタグ：
          {hashtags ? (
            <span className="font-semibold">{hashtags}</span>
          ) : (
            <span className="text-gray-700">なし</span>
          )}
          （
          <Link
            href={`${routes.settings()}?tab=site` as Route}
            className="text-blue-700 underline"
          >
            サイト設定の「サイト」
          </Link>
          の「X のハッシュタグ」で変えられます）
        </p>
        <p>
          リンク先：<span className="font-mono">{baseUrl}</span>
        </p>
        {!logsReady && (
          <p className="text-orange-800">
            「投稿済み」の記録には DB の更新が必要です（git pull のあと
            <code className="mx-1 rounded bg-orange-50 px-1">
              npx supabase db push --remote
            </code>
            ）。下書きのコピーと X への投稿は、このままでも使えます。
          </p>
        )}
      </div>

      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
          {section.drafts.length === 0 ? (
            <p className="rounded-lg border bg-white p-4 text-sm text-gray-600">
              {section.emptyText}
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {section.drafts.map((draft) => {
                const key = prLogKey(draft.sourceType, draft.sourceId);
                return (
                  <PrDraftCard
                    key={key}
                    draft={draft}
                    logs={logsByKey[key] ?? []}
                    logsReady={logsReady}
                  />
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
