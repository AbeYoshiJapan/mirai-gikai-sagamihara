/**
 * Next.js cache tags for revalidation
 */
export const CACHE_TAGS = {
  BILLS: "bills",
  DIET_SESSIONS: "diet-sessions",
  COUNCIL_MEETINGS: "council-meetings",
  INTERVIEW_CONFIGS: "interview-configs",
  // admin のレポート公開操作が revalidate するタグ。
  PUBLIC_INTERVIEW_REPORTS: "public-interview-reports",
  // admin の「サイト設定」保存が revalidate するタグ。
  SITE_SETTINGS: "site-settings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);
