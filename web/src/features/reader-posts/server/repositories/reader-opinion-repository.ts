import "server-only";

import {
  parseReaderOpinionAttributes,
  type ReaderOpinionAttributes,
  type ReaderOpinionStance,
} from "@mirai-gikai/shared/reader-posts/labels";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { PublicReaderOpinion } from "../../shared/types";

/** 意見を受け付けるのは公開中の議案だけ */
export async function findPublishedBillForReaderPost(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, name")
    .eq("id", billId)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch bill for reader post: ${error.message}`);
  }
  return data;
}

export async function createReaderOpinion(params: {
  billId: string;
  stance: ReaderOpinionStance;
  body: string;
  displayName: string;
  attributes: ReaderOpinionAttributes;
  consentToPublish: boolean;
  ipHash: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_opinions")
    .insert({
      bill_id: params.billId,
      stance: params.stance,
      body: params.body,
      display_name: params.displayName,
      attributes: params.attributes,
      consent_to_publish: params.consentToPublish,
      ip_hash: params.ipHash,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create reader opinion: ${error.message}`);
  }
  return data;
}

/** 公開中の意見（管理者が公開したものだけ）。新しい順 */
export async function findPublishedOpinionsByBillId(
  billId: string,
  limit: number
): Promise<PublicReaderOpinion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_opinions")
    .select(
      "id, stance, body, display_name, attributes, reply_md, published_at"
    )
    .eq("bill_id", billId)
    .eq("status", "published")
    .eq("consent_to_publish", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch published opinions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    stance: row.stance,
    body: row.body,
    display_name: row.display_name,
    attributes: parseReaderOpinionAttributes(row.attributes),
    reply_md: row.reply_md,
    published_at: row.published_at,
  }));
}
