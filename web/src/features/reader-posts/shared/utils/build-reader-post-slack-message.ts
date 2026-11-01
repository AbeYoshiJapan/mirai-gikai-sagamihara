import {
  READER_OPINION_STANCE_LABELS,
  type ReaderOpinionStance,
} from "@mirai-gikai/shared/reader-posts/labels";

export const SLACK_BODY_PREVIEW_LENGTH = 300;

export function buildAdminReaderOpinionsUrl(adminUrl: string): string {
  return `${adminUrl.replace(/\/+$/, "")}/reader-opinions`;
}

export function buildAdminReaderQuestionsUrl(adminUrl: string): string {
  return `${adminUrl.replace(/\/+$/, "")}/reader-questions`;
}

function truncate(text: string, maxLength: number): string {
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return `${chars.slice(0, maxLength).join("")}…`;
}

// Slack の mrkdwn で制御文字として解釈される記号だけをエスケープする
function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function quoteBody(body: string): string[] {
  return escapeSlackText(truncate(body, SLACK_BODY_PREVIEW_LENGTH))
    .split(/\r?\n/)
    .map((line) => `> ${line}`);
}

export function buildReaderOpinionSlackMessage(params: {
  billName: string;
  stance: ReaderOpinionStance;
  consentToPublish: boolean;
  body: string;
  adminInboxUrl: string;
}): string {
  return [
    "議案への意見が届きました（未公開）",
    `議案: ${escapeSlackText(params.billName)}`,
    `賛否: ${READER_OPINION_STANCE_LABELS[params.stance]}`,
    `公開の同意: ${params.consentToPublish ? "あり" : "なし"}`,
    `確認: ${params.adminInboxUrl}`,
    "内容:",
    ...quoteBody(params.body),
  ].join("\n");
}

export function buildReaderQuestionSlackMessage(params: {
  billName: string | null;
  hasContact: boolean;
  body: string;
  adminInboxUrl: string;
}): string {
  return [
    "質問が届きました（未回答）",
    `議案: ${params.billName ? escapeSlackText(params.billName) : "（議案に紐づかない質問）"}`,
    `連絡先: ${params.hasContact ? "あり" : "なし"}`,
    `確認: ${params.adminInboxUrl}`,
    "内容:",
    ...quoteBody(params.body),
  ].join("\n");
}
