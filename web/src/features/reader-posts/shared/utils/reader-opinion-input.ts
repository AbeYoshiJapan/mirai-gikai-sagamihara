import {
  READER_AGE_GROUPS,
  READER_OPINION_DISPLAY_NAME_MAX_LENGTH,
  READER_OPINION_STANCES,
  READER_POST_BODY_MAX_LENGTH,
  READER_RESIDENCES,
} from "@mirai-gikai/shared/reader-posts/labels";
import { z } from "zod";

export const readerOpinionInputSchema = z.object({
  billId: z.uuid("議案の指定が不正です"),
  stance: z.enum(READER_OPINION_STANCES, "賛否の指定が不正です"),
  body: z
    .string()
    .trim()
    .min(1, "意見を入力してください")
    .max(
      READER_POST_BODY_MAX_LENGTH,
      `意見は${READER_POST_BODY_MAX_LENGTH}文字以内で入力してください`
    ),
  displayName: z
    .string()
    .trim()
    .max(
      READER_OPINION_DISPLAY_NAME_MAX_LENGTH,
      `表示名は${READER_OPINION_DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`
    )
    .optional()
    .default(""),
  residence: z.enum(READER_RESIDENCES, "居住地の指定が不正です").optional(),
  ageGroup: z.enum(READER_AGE_GROUPS, "年代の指定が不正です").optional(),
  consentToPublish: z.boolean().optional().default(false),
});

export type ReaderOpinionInput = z.infer<typeof readerOpinionInputSchema>;

export type ParseReaderOpinionInputResult =
  | { ok: true; data: ReaderOpinionInput }
  | { ok: false; error: string };

export function parseReaderOpinionInput(
  input: unknown
): ParseReaderOpinionInputResult {
  const result = readerOpinionInputSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "入力内容が不正です",
    };
  }
  return { ok: true, data: result.data };
}

export function hasReaderPostBody(body: string): boolean {
  return body.trim().length > 0;
}
