import "server-only";

import {
  parseReaderOpinionAttributes,
  type ReaderOpinionStatus,
} from "@mirai-gikai/shared/reader-posts/labels";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { ReaderOpinionItem } from "../../shared/types";

const OPINION_SELECT =
  "id, bill_id, stance, body, display_name, attributes, consent_to_publish, status, reply_md, reviewed_at, published_at, created_at, bills(name)";

type OpinionRow = {
  id: string;
  bill_id: string;
  stance: ReaderOpinionItem["stance"];
  body: string;
  display_name: string;
  attributes: unknown;
  consent_to_publish: boolean;
  status: ReaderOpinionStatus;
  reply_md: string;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  bills: { name: string } | null;
};

function toItem(row: OpinionRow): ReaderOpinionItem {
  return {
    id: row.id,
    bill_id: row.bill_id,
    bill_name: row.bills?.name ?? "（削除された議案）",
    stance: row.stance,
    body: row.body,
    display_name: row.display_name,
    attributes: parseReaderOpinionAttributes(row.attributes),
    consent_to_publish: row.consent_to_publish,
    status: row.status,
    reply_md: row.reply_md,
    reviewed_at: row.reviewed_at,
    published_at: row.published_at,
    created_at: row.created_at,
  };
}

export async function findReaderOpinions(params: {
  status: ReaderOpinionStatus | "all";
  billId: string | null;
  limit: number;
}): Promise<ReaderOpinionItem[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("reader_opinions")
    .select(OPINION_SELECT)
    .order("created_at", { ascending: false })
    .limit(params.limit);
  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.billId) {
    query = query.eq("bill_id", params.billId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch reader opinions: ${error.message}`);
  }
  return ((data ?? []) as OpinionRow[]).map(toItem);
}

export async function countReaderOpinionsByStatus(
  billId: string | null
): Promise<Record<ReaderOpinionStatus, number>> {
  const supabase = createAdminClient();
  const counts: Record<ReaderOpinionStatus, number> = {
    received: 0,
    published: 0,
    rejected: 0,
  };
  await Promise.all(
    (Object.keys(counts) as ReaderOpinionStatus[]).map(async (status) => {
      let query = supabase
        .from("reader_opinions")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (billId) query = query.eq("bill_id", billId);
      const { count, error } = await query;
      if (error) {
        throw new Error(`Failed to count reader opinions: ${error.message}`);
      }
      counts[status] = count ?? 0;
    })
  );
  return counts;
}

export async function findReaderOpinionById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_opinions")
    .select("id, status, consent_to_publish")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch reader opinion: ${error.message}`);
  }
  return data;
}

/**
 * 意見の確認結果を保存する。reviewed_at / published_at は DB トリガーが status に合わせて揃える。
 */
export async function updateReaderOpinionReview(params: {
  id: string;
  status: ReaderOpinionStatus;
  replyMd: string;
  reviewerId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reader_opinions")
    .update({
      status: params.status,
      reply_md: params.replyMd,
      reviewed_by: params.status === "received" ? null : params.reviewerId,
    })
    .eq("id", params.id);
  if (error) {
    throw new Error(`Failed to update reader opinion: ${error.message}`);
  }
}

/**
 * 意見を削除する（元に戻せない）。
 * 消した意見の状態を返す（公開中だったかを見るため）。見つからなければ null。
 */
export async function deleteReaderOpinionById(
  id: string
): Promise<{ status: ReaderOpinionStatus } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_opinions")
    .delete()
    .eq("id", id)
    .select("status")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to delete reader opinion: ${error.message}`);
  }
  return data ? { status: data.status as ReaderOpinionStatus } : null;
}
