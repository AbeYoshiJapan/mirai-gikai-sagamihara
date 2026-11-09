"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  deleteReaderPostInputSchema,
  type ReaderPostActionResult,
} from "../../shared/types";
import { deleteReaderQuestionById } from "../repositories/reader-question-repository";

/**
 * 質問（トップの窓から届いた意見を含む）を削除する。元に戻せない。
 * スパム・広告、個人情報を含むものなど、利用規約の禁止事項に当たる投稿を消すために使う。
 */
export async function deleteReaderQuestion(
  input: unknown
): Promise<ReaderPostActionResult> {
  try {
    await requireAdmin();
    const { id } = deleteReaderPostInputSchema.parse(input);

    const deleted = await deleteReaderQuestionById(id);
    if (!deleted) {
      return { error: "すでに削除されているか、見つかりません" };
    }
    // 公開中だったものは、サイトからもすぐに消す
    if (deleted.status === "published") {
      await invalidateWebCache([WEB_CACHE_TAGS.READER_POSTS]);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Delete reader question error:", error);
    return { error: getErrorMessage(error, "削除に失敗しました") };
  }
}
