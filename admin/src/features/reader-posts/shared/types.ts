import {
  READER_OPINION_STATUSES,
  READER_QUESTION_STATUSES,
  READER_QUESTION_SUMMARY_MAX_LENGTH,
  type ReaderOpinionAttributes,
  type ReaderOpinionStance,
  type ReaderOpinionStatus,
  type ReaderQuestionKind,
  type ReaderQuestionStatus,
} from "@mirai-gikai/shared/reader-posts/labels";
import { z } from "zod";

export const REPLY_MAX_LENGTH = 4000;
export const ANSWER_MAX_LENGTH = 8000;

/** 管理画面の一覧に出す意見 */
export type ReaderOpinionItem = {
  id: string;
  bill_id: string;
  bill_name: string;
  stance: ReaderOpinionStance;
  body: string;
  display_name: string;
  attributes: ReaderOpinionAttributes;
  consent_to_publish: boolean;
  status: ReaderOpinionStatus;
  reply_md: string;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
};

/** 管理画面の一覧に出す質問 */
export type ReaderQuestionItem = {
  id: string;
  /** 質問か意見か（トップの「質問・意見の窓」で送り手が選ぶ） */
  kind: ReaderQuestionKind;
  bill_id: string | null;
  bill_name: string | null;
  body: string;
  contact: string;
  consent_to_publish: boolean;
  status: ReaderQuestionStatus;
  question_summary: string;
  answer_md: string;
  answered_at: string | null;
  published_at: string | null;
  created_at: string;
};

export const reviewReaderOpinionInputSchema = z.object({
  id: z.uuid(),
  status: z.enum(READER_OPINION_STATUSES),
  replyMd: z
    .string()
    .max(
      REPLY_MAX_LENGTH,
      `返信は${REPLY_MAX_LENGTH}文字以内で入力してください`
    ),
});
export type ReviewReaderOpinionInput = z.infer<
  typeof reviewReaderOpinionInputSchema
>;

export const answerReaderQuestionInputSchema = z.object({
  id: z.uuid(),
  status: z.enum(READER_QUESTION_STATUSES),
  answerMd: z
    .string()
    .max(
      ANSWER_MAX_LENGTH,
      `回答は${ANSWER_MAX_LENGTH}文字以内で入力してください`
    ),
  questionSummary: z
    .string()
    .max(
      READER_QUESTION_SUMMARY_MAX_LENGTH,
      `公開用の質問文は${READER_QUESTION_SUMMARY_MAX_LENGTH}文字以内で入力してください`
    ),
});
export type AnswerReaderQuestionInput = z.infer<
  typeof answerReaderQuestionInputSchema
>;

export type ReaderPostActionResult = { success: true } | { error: string };
