import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { StanceInput } from "../../shared/types";
import { toStanceColumns } from "../../shared/utils/to-stance-columns";
import { toUnpublishedStanceColumns } from "../../shared/utils/to-unpublished-stance-columns";

export async function findStanceByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mirai_stances")
    .select("*")
    .eq("bill_id", billId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      throw new Error(`Failed to fetch stance: ${error.message}`);
    }
    return null;
  }

  return data;
}

export async function createMiraiStance(billId: string, input: StanceInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("mirai_stances").insert({
    bill_id: billId,
    ...toStanceColumns(input),
  });

  if (error) {
    throw new Error(`Failed to create stance: ${error.message}`);
  }
}

export async function updateMiraiStance(stanceId: string, input: StanceInput) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mirai_stances")
    .update({
      ...toStanceColumns(input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stanceId);

  if (error) {
    throw new Error(`Failed to update stance: ${error.message}`);
  }
}

/**
 * bill_id をキーにスタンスを atomic に upsert する（MCP 用）。必ず非公開で保存する。
 * mirai_stances.bill_id は UNIQUE 制約があるため、onConflict で
 * 「あれば更新／なければ作成」を単一クエリで行い、check-then-act の競合を避ける。
 *
 * AI エージェントが書いた賛否を、運営者の確認なしに公開しないため。公開は管理画面で行う。
 */
export async function upsertUnpublishedMiraiStance(
  billId: string,
  input: StanceInput
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("mirai_stances").upsert(
    {
      bill_id: billId,
      ...toUnpublishedStanceColumns(input),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "bill_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert stance: ${error.message}`);
  }
}

export async function deleteMiraiStance(stanceId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mirai_stances")
    .delete()
    .eq("id", stanceId);

  if (error) {
    throw new Error(`Failed to delete stance: ${error.message}`);
  }
}

/**
 * 公開確認日を迎えた非公開の賛否を、公開確認日の古い順に返す。
 * onOrBefore は JST の日付（YYYY-MM-DD）。
 */
export async function findStancesPendingReview(onOrBefore: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mirai_stances")
    .select(
      "bill_id, type, comment, reason_summary, reason_points, publish_review_date, updated_at, bills(name)"
    )
    .eq("is_published", false)
    .lte("publish_review_date", onOrBefore)
    .order("publish_review_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch stances pending review: ${error.message}`);
  }

  return data;
}

/**
 * 非公開の賛否の公開確認日を更新する。内容の変更ではないため updated_at は更新しない。
 * 更新できた場合は true を返す。
 */
export async function updateUnpublishedStanceReviewDate(
  billId: string,
  publishReviewDate: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mirai_stances")
    .update({ publish_review_date: publishReviewDate })
    .eq("bill_id", billId)
    .eq("is_published", false)
    .select("bill_id");

  if (error) {
    throw new Error(`Failed to update stance review date: ${error.message}`);
  }

  return data.length > 0;
}
