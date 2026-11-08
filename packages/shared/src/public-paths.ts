/**
 * 公開サイト（web）のページのパス。管理画面から公開ページへのリンクを作るときに使う。
 * web 側の `web/src/lib/routes.ts` と同じ形にする（web の routes.test.ts で一致を確かめる）。
 */
export const publicPaths = {
  home: () => "/",
  billDetail: (billId: string) => `/bills/${billId}`,
  schedule: () => "/schedule",
  questions: () => "/questions",
  councilQuestionMeeting: (meetingKey: string) =>
    `/council-questions/${meetingKey}`,
  councilQuestionDetail: (meetingKey: string, questionId: string) =>
    `/council-questions/${meetingKey}/${questionId}`,
} as const;

/** 議案のページの、意見・質問の欄の見出し（ページ内リンクの行き先） */
export const BILL_PAGE_ANCHORS = {
  readerOpinions: "reader-opinions-heading",
  readerQuestions: "reader-questions-heading",
} as const;

/** 公開サイトの URL（末尾の / は取る）とパスをつなぐ */
export function toPublicUrl(baseUrl: string, path: string, anchor?: string) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  return `${base}${path}${anchor ? `#${anchor}` : ""}`;
}
