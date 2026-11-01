import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { ReaderQuestionForm } from "@/features/reader-posts/client/components/reader-question-form";
import { ReaderFaqList } from "@/features/reader-posts/server/components/reader-faq-list";
import { ReaderPostNotice } from "@/features/reader-posts/server/components/reader-post-notice";
import { getAllPublishedReaderQuestions } from "@/features/reader-posts/server/loaders/get-published-reader-questions";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  return {
    title: `質問と回答 | ${site.name}`,
    description: `${council.name}や議案について寄せられた質問と、運営者の回答です。`,
  };
}

/**
 * 寄せられた質問と回答（よくある質問）の一覧と、議案に紐づかない一般の質問フォーム。
 * 公開しているのは、回答が付き、投稿者が公開に同意した質問だけ。
 */
export default async function QuestionsPage() {
  await requireFeature("question_form");
  const [{ council, operator }, questions] = await Promise.all([
    getSiteSettings(),
    getAllPublishedReaderQuestions(),
  ]);

  return (
    <LegalPageLayout
      title="質問と回答"
      enLabel="Q&A"
      description={`${council.name}や議案、このサイトについて寄せられた質問と、${operator.name}の回答です。`}
    >
      <section className="space-y-4">
        <LegalSectionTitle>よくある質問</LegalSectionTitle>
        {questions.length === 0 ? (
          <LegalParagraph className="text-mirai-text-subtle">
            まだ公開している質問はありません。
          </LegalParagraph>
        ) : (
          <ReaderFaqList questions={questions} showBillLink />
        )}
      </section>

      <section className="space-y-4">
        <LegalSectionTitle>質問を送る</LegalSectionTitle>
        <LegalParagraph>
          議会のしくみや、このサイトについての質問を受け付けています。特定の議案についての質問は、その議案のページにあるフォームからお送りください。
        </LegalParagraph>
        <ReaderQuestionForm openLabel="質問を送る" />
        <ReaderPostNotice councilName={council.name} />
      </section>
    </LegalPageLayout>
  );
}
