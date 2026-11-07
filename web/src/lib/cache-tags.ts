/**
 * Next.js cache tags for revalidation
 */
export const CACHE_TAGS = {
  BILLS: "bills",
  DIET_SESSIONS: "diet-sessions",
  COUNCIL_MEETINGS: "council-meetings",
  // admin の「議会での質問」とテーマの操作が revalidate するタグ。
  COUNCIL_QUESTIONS: "council-questions",
  INTERVIEW_CONFIGS: "interview-configs",
  // admin のレポート公開操作が revalidate するタグ。
  PUBLIC_INTERVIEW_REPORTS: "public-interview-reports",
  // admin の「サイト設定」保存が revalidate するタグ。
  SITE_SETTINGS: "site-settings",
  // admin の意見・質問の公開操作が revalidate するタグ。
  READER_POSTS: "reader-posts",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);
