import { findBillNameById } from "@/features/article-reports/server/repositories/article-report-repository";
import { ReaderQuestionInbox } from "@/features/reader-posts/client/components/reader-question-inbox";
import { InboxTabs } from "@/features/reader-posts/server/components/inbox-tabs";
import {
  loadReaderOpinionInbox,
  loadReaderQuestionInbox,
} from "@/features/reader-posts/server/loaders/load-reader-posts";
import {
  parseBillIdFilter,
  parseQuestionInboxFilter,
} from "@/features/reader-posts/shared/utils/inbox-filter";

export default async function ReaderQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = parseQuestionInboxFilter(params.status);
  const billId = parseBillIdFilter(params.billId);

  const [inbox, opinionInbox, bill] = await Promise.all([
    loadReaderQuestionInbox({ status, billId }),
    loadReaderOpinionInbox({ status: "received", billId }),
    billId ? findBillNameById(billId) : null,
  ]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-2 text-2xl font-bold">意見・質問</h1>
      <p className="mb-6 text-sm text-gray-500">
        質問フォームと、トップページの「質問・意見の窓」に届いた投稿です。窓から届いた意見には「意見」の印がつきます。
        回答（返事）を書いて「回答済み」にし、投稿者が公開に同意しているものは「よくある質問」として公開できます。
        返信先が書かれている場合は、そちらへ直接お返事することもできます（返信先は公開されません）。
      </p>

      <InboxTabs
        kind="questions"
        current={status}
        counts={inbox.counts}
        pendingCounts={{
          opinions: opinionInbox.counts.received,
          questions: inbox.counts.received,
        }}
        billId={billId}
        billName={bill?.name ?? null}
      />

      {inbox.reachedLimit && (
        <p className="mb-4 text-sm text-gray-600">
          直近{inbox.limit}件を表示しています
        </p>
      )}

      <ReaderQuestionInbox items={inbox.items} />
    </div>
  );
}
