import {
  READER_POST_BODY_MAX_LENGTH,
  READER_QUESTION_CONTACT_MAX_LENGTH,
} from "@mirai-gikai/shared/reader-posts/labels";
import { z } from "zod";

export const readerQuestionInputSchema = z.object({
  /** 議案に紐づかない一般の質問は省略 */
  billId: z.uuid("議案の指定が不正です").optional(),
  body: z
    .string()
    .trim()
    .min(1, "質問を入力してください")
    .max(
      READER_POST_BODY_MAX_LENGTH,
      `質問は${READER_POST_BODY_MAX_LENGTH}文字以内で入力してください`
    ),
  contact: z
    .string()
    .trim()
    .max(
      READER_QUESTION_CONTACT_MAX_LENGTH,
      `連絡先は${READER_QUESTION_CONTACT_MAX_LENGTH}文字以内で入力してください`
    )
    .optional()
    .default(""),
  consentToPublish: z.boolean().optional().default(false),
});

export type ReaderQuestionInput = z.infer<typeof readerQuestionInputSchema>;

export type ParseReaderQuestionInputResult =
  | { ok: true; data: ReaderQuestionInput }
  | { ok: false; error: string };

export function parseReaderQuestionInput(
  input: unknown
): ParseReaderQuestionInputResult {
  const result = readerQuestionInputSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "入力内容が不正です",
    };
  }
  return { ok: true, data: result.data };
}
