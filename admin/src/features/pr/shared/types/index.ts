import type {
  BillKind,
  BillResult,
  BillStage,
  VoteOutcome,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { CouncilQuestionKind } from "@mirai-gikai/shared/council-questions/types";
import type { ReaderQuestionKind } from "@mirai-gikai/shared/reader-posts/labels";

/** 投稿の話題の種類（pr_post_logs.source_type と同じ） */
export const PR_SOURCE_TYPES = [
  "bill",
  "meeting",
  "council_questions",
  "reader_opinions",
  "reader_question",
  "other",
] as const;
export type PrSourceType = (typeof PR_SOURCE_TYPES)[number];

/** 下書きを作る材料：議案 */
export type PrBillSource = {
  id: string;
  title: string;
  billNumber: string | null;
  bill_kind: BillKind;
  stage: BillStage | null;
  result: BillResult | null;
  vote_outcome: VoteOutcome | null;
  decidedOn: string | null;
  updatedAt: string;
};

/** 下書きを作る材料：会議の予定 */
export type PrMeetingSource = {
  id: string;
  name: string;
  meetingDate: string;
  startTime: string | null;
  place: string | null;
  topic: string | null;
};

/** 下書きを作る材料：定例会議ごとの議会での質問 */
export type PrQuestionMeetingSource = {
  meetingKey: string;
  meetingName: string;
  counts: Record<CouncilQuestionKind, number>;
  /** 一般質問の質問日（YYYY-MM-DD、古い順・重なりなし） */
  generalDates: string[];
};

/** 下書きを作る材料：議案ごとの公開中の意見 */
export type PrOpinionsSource = {
  billId: string;
  billTitle: string;
  count: number;
  latestPublishedAt: string | null;
};

/** 下書きを作る材料：公開中の質問と回答 */
export type PrQuestionSource = {
  id: string;
  /** 質問か意見か */
  kind: ReaderQuestionKind;
  billId: string | null;
  billTitle: string | null;
  question: string;
  publishedAt: string | null;
};

/** 投稿の下書き（運営者が直してから投稿する） */
export type PrDraft = {
  sourceType: PrSourceType;
  sourceId: string;
  /** カードの見出し（何についての下書きか） */
  heading: string;
  /** 補足（日付・件数など） */
  note: string | null;
  /** 下書きの本文（URL・ハッシュタグ込み） */
  text: string;
  /** 公開ページの URL */
  url: string;
};

/** 投稿したことの記録 */
export type PrPostLog = {
  id: string;
  sourceType: PrSourceType;
  sourceId: string;
  body: string;
  postedAt: string;
};

export type PrSection = {
  key: string;
  title: string;
  description: string;
  emptyText: string;
  drafts: PrDraft[];
};

export type PrPageData = {
  sections: PrSection[];
  /** 話題ごとの投稿の記録（新しい順）。キーは prLogKey() */
  logsByKey: Record<string, PrPostLog[]>;
  /** 投稿の記録の表があるか（DB の更新前は false） */
  logsReady: boolean;
  hashtags: string;
  baseUrl: string;
};
