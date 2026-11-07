/**
 * admin アプリの内部ルート定義
 *
 * app/ ディレクトリの page.tsx と 1:1 対応する。
 * Link href や router.push には必ずこのファイルの関数を使うこと。
 * 新しいページを追加したらここにもルートを追加し、テストを通すこと。
 */

// ── 静的ルート ──────────────────────────────────────
export const routes = {
  login: () => "/login" as const,
  bills: () => "/bills" as const,
  billNew: () => "/bills/new" as const,
  admins: () => "/admins" as const,
  tags: () => "/tags" as const,
  dietSessions: () => "/diet-sessions" as const,
  committees: () => "/committees" as const,
  councilMeetings: () => "/council-meetings" as const,
  councilMeetingNew: () => "/council-meetings/new" as const,
  councilQuestions: () => "/council-questions" as const,
  experts: () => "/experts" as const,
  interviews: () => "/interviews" as const,
  interviewOpinionBackfill: () => "/interview-opinion-backfill" as const,
  userTopicAnalysisAll: () => "/user-topic-analysis" as const,
  importPage: () => "/import" as const,
  readerOpinions: () => "/reader-opinions" as const,
  readerQuestions: () => "/reader-questions" as const,
  settings: () => "/settings" as const,
  setup: () => "/setup" as const,

  // ── 会議予定 ──────────────────────────────────────
  councilMeetingEdit: (meetingId: string) =>
    `/council-meetings/${meetingId}/edit` as const,

  // ── 議会での質問 ──────────────────────────────────
  councilQuestionMeeting: (meetingKey: string) =>
    `/council-questions/${meetingKey}` as const,
  councilQuestionEdit: (meetingKey: string, questionId: string) =>
    `/council-questions/${meetingKey}/${questionId}` as const,

  // ── 議案配下 ──────────────────────────────────────
  billEdit: (billId: string) => `/bills/${billId}/edit` as const,
  billContentsEdit: (billId: string) =>
    `/bills/${billId}/contents/edit` as const,
  billUserTopicAnalysis: (billId: string) =>
    `/bills/${billId}/user-topic-analysis` as const,
  billAnalysisViewer: (billId: string) =>
    `/bills/${billId}/analysis-viewer` as const,
  billArticleReports: (billId: string) =>
    `/bills/${billId}/article-reports` as const,
  billGenerate: (billId: string) => `/bills/${billId}/generate` as const,

  // インタビュー
  billInterview: (billId: string) => `/bills/${billId}/interview` as const,
  billInterviewNew: (billId: string) =>
    `/bills/${billId}/interview/new` as const,
  billInterviewEdit: (billId: string, configId: string) =>
    `/bills/${billId}/interview/${configId}/edit` as const,

  // レポート（インタビュー設定配下）
  billReports: (billId: string, configId: string) =>
    `/bills/${billId}/interview/${configId}/reports` as const,
  billReportsSearch: (billId: string, configId: string) =>
    `/bills/${billId}/interview/${configId}/reports/search` as const,
  billReportDetail: (billId: string, configId: string, sessionId: string) =>
    `/bills/${billId}/interview/${configId}/reports/${sessionId}` as const,

  // トピック解析（インタビュー設定配下）
  billTopicAnalysis: (billId: string, configId: string) =>
    `/bills/${billId}/interview/${configId}/topic-analysis` as const,
  billTopicAnalysisDetail: (
    billId: string,
    configId: string,
    versionId: string
  ) =>
    `/bills/${billId}/interview/${configId}/topic-analysis/${versionId}` as const,
} as const;
