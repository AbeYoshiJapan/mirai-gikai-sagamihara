import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import { Container } from "@/components/layouts/container";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getPublicReportsByBillId } from "@/features/interview-report/server/loaders/get-public-reports-by-bill-id";
import { BillReaderOpinionsSection } from "@/features/reader-posts/server/components/bill-reader-opinions-section";
import { BillReaderQuestionsSection } from "@/features/reader-posts/server/components/bill-reader-questions-section";
import { getPublishedReaderOpinions } from "@/features/reader-posts/server/loaders/get-published-reader-opinions";
import { getPublishedReaderQuestionsByBillId } from "@/features/reader-posts/server/loaders/get-published-reader-questions";
import { BillTopicsPreviewSection } from "@/features/user-topic-analysis/server/components/bill-topics-preview-section";
import { getPublicTopicAnalysis } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { getJapanTime } from "@/lib/utils/date";
import { BillDetailClient } from "../../../client/components/bill-detail/bill-detail-client";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import { BillStatusProgress } from "../../../client/components/bill-detail/bill-status-progress";
import { MiraiStanceCard } from "../../../client/components/bill-detail/mirai-stance-card";
import { PlanPhaseProgress } from "../../../client/components/bill-detail/plan-phase-progress";
import type { BillWithContent } from "../../../shared/types";
import { getPlanPhase } from "../../../shared/utils/plan-phase";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";
import { BillSourcesSection } from "./bill-sources-section";
import { BillVotesSection } from "./bill-votes-section";

interface BillDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
}

export async function BillDetailLayout({
  bill,
  currentDifficulty,
}: BillDetailLayoutProps) {
  const { features, council, operator, brand } = await getSiteSettings();
  // 利用者向け AI 機能（インタビュー・トピック分析）と意見・質問は機能フラグが立っているときだけ読む
  const [
    interviewConfig,
    publicReportsResult,
    topicAnalysis,
    readerOpinions,
    readerQuestions,
  ] = await Promise.all([
    features.ai_interview ? getInterviewConfig(bill.id) : null,
    features.topic_analysis
      ? getPublicReportsByBillId(bill.id)
      : { totalCount: 0 },
    features.topic_analysis ? getPublicTopicAnalysis(bill.id) : null,
    features.opinion_form ? getPublishedReaderOpinions(bill.id) : [],
    features.question_form ? getPublishedReaderQuestionsByBillId(bill.id) : [],
  ]);

  // 行政計画は自治体のパブコメ期間で段階が変わる。AIインタビューは「意見募集中」の間だけ出す
  const isPlan = bill.bill_kind === "plan";
  const planPhase = isPlan ? getPlanPhase(bill, getJapanTime()) : null;
  const showInterview =
    features.ai_interview &&
    interviewConfig != null &&
    (!isPlan || planPhase === "opinion");

  return (
    <div className="container mx-auto pb-8 max-w-4xl">
      {/*
        テキスト選択機能とチャット連携の実装パターン:
        - BillContentはServer Componentのまま保持（SSRによる高速な初期レンダリング）
        - BillDetailClientでクライアントサイド機能（テキスト選択、チャット連携）を提供
        - このパターンによりSSRを保持しつつインタラクティブ機能を実装
      */}
      <BillDetailClient
        bill={bill}
        currentDifficulty={currentDifficulty}
        hasInterviewConfig={showInterview}
        chatEnabled={features.ai_chat}
      >
        <BillDetailHeader
          bill={bill}
          hasInterviewConfig={showInterview}
          opinionCount={topicAnalysis?.total_opinions ?? 0}
          topicCount={topicAnalysis?.topics.length ?? 0}
        />
        <Container>
          {/* 議案ステータス進捗 */}
          <div className="my-8">
            {planPhase ? (
              <PlanPhaseProgress
                phase={planPhase}
                statusNote={bill.status_note}
                publicCommentStart={bill.public_comment_start}
                publicCommentEnd={bill.public_comment_end}
                publicCommentUrl={bill.public_comment_url}
              />
            ) : (
              <BillStatusProgress
                bill={{
                  bill_kind: bill.bill_kind,
                  stage: bill.stage,
                  result: bill.result,
                  vote_outcome: bill.vote_outcome,
                  committee_name: bill.committee?.name ?? null,
                }}
                statusNote={bill.status_note}
              />
            )}
          </div>

          <BillContent bill={bill} chatEnabled={features.ai_chat} />
        </Container>
      </BillDetailClient>

      <Container>
        {/* 一次資料：議案書・会議録・審議結果へのリンク */}
        <div className="my-8">
          <BillSourcesSection
            sources={bill.sources ?? []}
            billDocumentUrl={bill.bill_document_url}
            primarySourceLabel={council.primary_source_label}
          />
        </div>

        {/* 会派・議員ごとの賛否（機能フラグ） */}
        {(features.faction_votes || features.member_votes) && bill.votes && (
          <div className="my-8">
            <BillVotesSection
              votes={bill.votes}
              showFactions={features.faction_votes}
              showMembers={features.member_votes}
            />
          </div>
        )}

        {/* 意見フォーム：公開済みの意見と投稿フォーム（機能フラグ）。投稿は管理者が確認するまで公開されない */}
        {features.opinion_form && (
          <div className="my-8">
            <BillReaderOpinionsSection
              billId={bill.id}
              opinions={readerOpinions}
              municipality={council.municipality}
              councilName={council.name}
              operatorName={operator.name}
            />
          </div>
        )}

        {/* 質問フォーム：公開済みの質問と回答、投稿フォーム（機能フラグ） */}
        {features.question_form && (
          <div className="my-8">
            <BillReaderQuestionsSection
              billId={bill.id}
              questions={readerQuestions}
              councilName={council.name}
              operatorName={operator.name}
            />
          </div>
        )}

        {/* 議案のトピック一覧（AIインタビュー意見の整理）。機能フラグで出し分け */}
        {features.topic_analysis && (
          <div className="my-8">
            <BillTopicsPreviewSection
              billId={bill.id}
              topics={topicAnalysis?.topics ?? []}
              publicReportCount={publicReportsResult.totalCount}
            />
          </div>
        )}

        {showInterview && (
          <div className="my-8">
            <InterviewLandingSection billId={bill.id} />
          </div>
        )}
        {/*
          賛否が未設定・非公開（公開日時前を含む）なら出さない。法案提出前でも、
          賛否を登録していない段階で「法案提出前」のカードだけを出すことはしない。
        */}
        {features.operator_stance && bill.mirai_stance && (
          <div className="my-8">
            <MiraiStanceCard
              stance={bill.mirai_stance}
              billStatus={bill.status}
              title={`${operator.name || "運営者"}の賛否`}
              logoSrc={brandAsset(brand, "logo_url")}
            />
          </div>
        )}
        {/* シェアボタン */}
        <div className="my-8">
          <BillShareButtons bill={bill} />
        </div>

        {/* データの出典と免責事項 */}
        <div className="my-8">
          <BillDisclaimer />
        </div>
      </Container>
    </div>
  );
}
