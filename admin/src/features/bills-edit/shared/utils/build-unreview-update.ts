import type { Database } from "@mirai-gikai/supabase";

type BillPublishStatus = Database["public"]["Enums"]["bill_publish_status"];

export type UnreviewUpdate = {
  is_review_completed: false;
  publish_status?: "draft";
};

/**
 * 議案を「運営者の確認前」に戻すときの更新内容。
 *
 * AI 生成の反映や MCP からの書き込みなど、運営者が中身を確かめていない変更を
 * 入れるときに使う。公開中の議案は公開を取り下げて下書きに戻し、確認し直して
 * から再公開する（公開中のものは、すべて運営者が確認したものに限る）。
 * 公開予定（coming_soon）・下書きは状態をそのままにする。
 */
export function buildUnreviewUpdate(
  publishStatus: BillPublishStatus
): UnreviewUpdate {
  return {
    is_review_completed: false,
    ...(publishStatus === "published" && { publish_status: "draft" }),
  };
}
