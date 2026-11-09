import { findBillNameById } from "@/features/article-reports/server/repositories/article-report-repository";
import { ReaderOpinionInbox } from "@/features/reader-posts/client/components/reader-opinion-inbox";
import { InboxTabs } from "@/features/reader-posts/server/components/inbox-tabs";
import {
  loadReaderOpinionInbox,
  loadReaderQuestionInbox,
} from "@/features/reader-posts/server/loaders/load-reader-posts";
import {
  parseBillIdFilter,
  parseOpinionInboxFilter,
} from "@/features/reader-posts/shared/utils/inbox-filter";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";

export default async function ReaderOpinionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = parseOpinionInboxFilter(params.status);
  const billId = parseBillIdFilter(params.billId);

  const [inbox, questionInbox, { settings }, bill] = await Promise.all([
    loadReaderOpinionInbox({ status, billId }),
    loadReaderQuestionInbox({ status: "received", billId }),
    loadSiteSettings(),
    billId ? findBillNameById(billId) : null,
  ]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-2 text-2xl font-bold">意見・質問</h1>
      <p className="mb-6 text-sm text-gray-500">
        議案ページの意見フォームに届いた投稿です。投稿は届いた時点では公開されません。内容を確認し、投稿者が公開に同意しているものだけを公開できます。
        返信を書くと、公開時に意見と一緒に表示されます。トップページの「質問・意見の窓」から届いた意見は「質問・窓からの意見」に並びます。
        スパムや広告、個人情報を含むものなど、利用規約に反する投稿は「削除」で完全に消せます（元に戻せません）。
      </p>

      <InboxTabs
        kind="opinions"
        current={status}
        counts={inbox.counts}
        pendingCounts={{
          opinions: inbox.counts.received,
          questions: questionInbox.counts.received,
        }}
        billId={billId}
        billName={bill?.name ?? null}
      />

      {inbox.reachedLimit && (
        <p className="mb-4 text-sm text-gray-600">
          直近{inbox.limit}件を表示しています
        </p>
      )}

      <ReaderOpinionInbox
        items={inbox.items}
        municipality={settings.council.municipality}
      />
    </div>
  );
}
