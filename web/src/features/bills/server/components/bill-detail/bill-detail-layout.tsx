import { Container } from "@/components/layouts/container";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getPublicReportsByBillId } from "@/features/interview-report/server/loaders/get-public-reports-by-bill-id";
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

interface BillDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
}

export async function BillDetailLayout({
  bill,
  currentDifficulty,
}: BillDetailLayoutProps) {
  const { features } = await getSiteSettings();
  // 利用者向け AI 機能（インタビュー・トピック分析）は機能フラグが立っているときだけ読む
  const [interviewConfig, publicReportsResult, topicAnalysis] =
    await Promise.all([
      features.ai_interview ? getInterviewConfig(bill.id) : null,
      features.topic_analysis
        ? getPublicReportsByBillId(bill.id)
        : { totalCount: 0 },
      features.topic_analysis ? getPublicTopicAnalysis(bill.id) : null,
    ]);

  // 行政計画は自治体のパブコメ期間で段階が変わる。AIインタビューは「意見募集中」の間だけ出す
  const isPlan = bill.status === "plan";
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
                status={bill.status}
                originatingHouse={bill.originating_house}
                statusNote={bill.status_note}
              />
            )}
          </div>

          <BillContent bill={bill} />
        </Container>
      </BillDetailClient>

      <Container>
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
