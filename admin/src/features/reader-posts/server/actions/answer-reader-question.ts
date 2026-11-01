"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  answerReaderQuestionInputSchema,
  type ReaderPostActionResult,
} from "../../shared/types";
import {
  findReaderQuestionById,
  updateReaderQuestionAnswer,
} from "../repositories/reader-question-repository";

/**
 * 質問への回答と公開状態を保存する。
 * 公開できるのは、回答があり、投稿者が公開に同意した質問だけ（DB 制約でも守られる）。
 */
export async function answerReaderQuestion(
  input: unknown
): Promise<ReaderPostActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = answerReaderQuestionInputSchema.parse(input);
    const answerMd = parsed.answerMd.trim();

    const current = await findReaderQuestionById(parsed.id);
    if (!current) {
      return { error: "質問が見つかりません" };
    }
    if (parsed.status === "published") {
      if (!current.consent_to_publish) {
        return { error: "投稿者が公開に同意していないため公開できません" };
      }
      if (answerMd.length === 0) {
        return { error: "回答を書いてから公開してください" };
      }
    }
    if (parsed.status === "answered" && answerMd.length === 0) {
      return { error: "回答を書いてから「回答済み」にしてください" };
    }

    await updateReaderQuestionAnswer({
      id: parsed.id,
      status: parsed.status,
      answerMd,
      questionSummary: parsed.questionSummary.trim(),
      answererId: admin.id,
    });

    if (parsed.status === "published" || current.status === "published") {
      await invalidateWebCache([WEB_CACHE_TAGS.READER_POSTS]);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Answer reader question error:", error);
    return { error: getErrorMessage(error, "質問の更新に失敗しました") };
  }
}
