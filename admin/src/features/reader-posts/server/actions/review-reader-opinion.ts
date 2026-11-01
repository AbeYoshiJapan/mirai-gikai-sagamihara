"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type ReaderPostActionResult,
  reviewReaderOpinionInputSchema,
} from "../../shared/types";
import {
  findReaderOpinionById,
  updateReaderOpinionReview,
} from "../repositories/reader-opinion-repository";

/**
 * 意見の確認結果（公開・非公開・未対応に戻す）と返信を保存する。
 * 公開できるのは投稿者が公開に同意した意見だけ（DB 制約でも守られる）。
 */
export async function reviewReaderOpinion(
  input: unknown
): Promise<ReaderPostActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = reviewReaderOpinionInputSchema.parse(input);

    const current = await findReaderOpinionById(parsed.id);
    if (!current) {
      return { error: "意見が見つかりません" };
    }
    if (parsed.status === "published" && !current.consent_to_publish) {
      return { error: "投稿者が公開に同意していないため公開できません" };
    }

    await updateReaderOpinionReview({
      id: parsed.id,
      status: parsed.status,
      replyMd: parsed.replyMd.trim(),
      reviewerId: admin.id,
    });

    // 公開状態が変わる・公開中の返信が変わるときだけ web のキャッシュを消す
    if (parsed.status === "published" || current.status === "published") {
      await invalidateWebCache([WEB_CACHE_TAGS.READER_POSTS]);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Review reader opinion error:", error);
    return { error: getErrorMessage(error, "意見の更新に失敗しました") };
  }
}
