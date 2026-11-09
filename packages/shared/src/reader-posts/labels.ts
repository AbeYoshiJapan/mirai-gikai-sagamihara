import { z } from "zod";

/**
 * 読者からの意見・質問（reader_opinions / reader_questions）の語彙と表示名。
 * DB の enum reader_opinion_stance / reader_opinion_status / reader_question_status と一致させる。
 */

export const READER_POST_BODY_MAX_LENGTH = 1000;
export const READER_OPINION_DISPLAY_NAME_MAX_LENGTH = 30;
export const READER_QUESTION_CONTACT_MAX_LENGTH = 200;
export const READER_QUESTION_SUMMARY_MAX_LENGTH = 1000;

// ── 意見 ──────────────────────────────────────────

/** 質問フォームから届くものの種類（reader_questions.kind） */
export const READER_QUESTION_KINDS = ["question", "opinion"] as const;
export type ReaderQuestionKind = (typeof READER_QUESTION_KINDS)[number];

export const READER_QUESTION_KIND_LABELS: Record<ReaderQuestionKind, string> = {
  question: "質問",
  opinion: "意見",
};

/** DB の値を種類として読む（知らない値は質問として扱う） */
export function toReaderQuestionKind(value: unknown): ReaderQuestionKind {
  return value === "opinion" ? "opinion" : "question";
}

export const READER_OPINION_STANCES = [
  "for",
  "against",
  "neutral",
  "unsure",
] as const;
export type ReaderOpinionStance = (typeof READER_OPINION_STANCES)[number];

export const READER_OPINION_STANCE_LABELS: Record<ReaderOpinionStance, string> =
  {
    for: "賛成",
    against: "反対",
    neutral: "どちらともいえない",
    unsure: "わからない",
  };

export const READER_OPINION_STATUSES = [
  "received",
  "published",
  "rejected",
] as const;
export type ReaderOpinionStatus = (typeof READER_OPINION_STATUSES)[number];

export const READER_OPINION_STATUS_LABELS: Record<ReaderOpinionStatus, string> =
  {
    received: "未対応",
    published: "公開中",
    rejected: "非公開",
  };

/** 任意属性：居住区分 */
export const READER_RESIDENCES = ["inside", "outside", "unknown"] as const;
export type ReaderResidence = (typeof READER_RESIDENCES)[number];

/** 任意属性：年代 */
export const READER_AGE_GROUPS = [
  "under20",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s",
  "70s_plus",
] as const;
export type ReaderAgeGroup = (typeof READER_AGE_GROUPS)[number];

export const READER_AGE_GROUP_LABELS: Record<ReaderAgeGroup, string> = {
  under20: "10代以下",
  "20s": "20代",
  "30s": "30代",
  "40s": "40代",
  "50s": "50代",
  "60s": "60代",
  "70s_plus": "70代以上",
};

/** reader_opinions.attributes の形。個人を特定しない属性だけを持つ */
export const readerOpinionAttributesSchema = z
  .object({
    residence: z.enum(READER_RESIDENCES).optional(),
    age_group: z.enum(READER_AGE_GROUPS).optional(),
  })
  .strict();
export type ReaderOpinionAttributes = z.infer<
  typeof readerOpinionAttributesSchema
>;

/** 居住区分の表示名。市名を入れて「相模原市内」のように出す */
export function getResidenceLabel(
  residence: ReaderResidence,
  municipality: string
): string {
  switch (residence) {
    case "inside":
      return `${municipality}内在住`;
    case "outside":
      return `${municipality}外在住`;
    default:
      return "居住地は回答なし";
  }
}

/** jsonb から属性を安全に読む。壊れていれば空にする */
export function parseReaderOpinionAttributes(
  value: unknown
): ReaderOpinionAttributes {
  const result = readerOpinionAttributesSchema.safeParse(value ?? {});
  return result.success ? result.data : {};
}

/** 公開ページに出す属性ラベル（例: 「相模原市内在住・40代」） */
export function formatReaderOpinionAttributes(
  attributes: ReaderOpinionAttributes,
  municipality: string
): string {
  const parts: string[] = [];
  if (attributes.residence && attributes.residence !== "unknown") {
    parts.push(getResidenceLabel(attributes.residence, municipality));
  }
  if (attributes.age_group) {
    parts.push(READER_AGE_GROUP_LABELS[attributes.age_group]);
  }
  return parts.join("・");
}

/** 公開時の表示名。空なら「匿名」 */
export function getReaderDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  return trimmed.length > 0 ? trimmed : "匿名";
}

// ── 質問 ──────────────────────────────────────────

export const READER_QUESTION_STATUSES = [
  "received",
  "answered",
  "published",
  "closed",
] as const;
export type ReaderQuestionStatus = (typeof READER_QUESTION_STATUSES)[number];

export const READER_QUESTION_STATUS_LABELS: Record<
  ReaderQuestionStatus,
  string
> = {
  received: "未回答",
  answered: "回答済み",
  published: "公開中",
  closed: "終了",
};

/** 公開ページに出す質問文。公開用の言い換えがあればそちらを使う */
export function getPublicQuestionText(question: {
  body: string;
  question_summary: string;
}): string {
  const summary = question.question_summary.trim();
  return summary.length > 0 ? summary : question.body;
}
