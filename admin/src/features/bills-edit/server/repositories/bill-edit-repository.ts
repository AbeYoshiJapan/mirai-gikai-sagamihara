import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { BILL_THUMBNAILS_BUCKET } from "../../shared/constants";
import type { BillInsert } from "../../shared/types";
import type { DifficultyLevel } from "../../shared/types/bill-contents";
import { mapBillDbError } from "../../shared/utils/map-bill-db-error";

export async function findBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill: ${error.message}`);
  }

  return data;
}

export async function findBillIdById(id: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch bill: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function findBillContentsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select("*")
    .eq("bill_id", billId)
    .order("difficulty_level");

  if (error) {
    throw new Error(`Failed to fetch bill contents: ${error.message}`);
  }

  return data ?? [];
}

export async function findBillTagIdsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("tag_id")
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill tag ids: ${error.message}`);
  }

  return data?.map((item) => item.tag_id) ?? [];
}

export async function findBillBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill by slug: ${error.message}`);
  }

  return data;
}

export async function createBillRecord(insertData: BillInsert) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw new Error(mapBillDbError(error, "create"));
  }

  return data;
}

export async function updateBillRecord(
  id: string,
  updateData: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bills")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(mapBillDbError(error, "update"));
  }
}

export async function upsertBillContent(params: {
  billId: string;
  difficultyLevel: DifficultyLevel;
  title: string;
  summary: string;
  content: string;
  /** 生成結果の反映なら、どの生成からかを残す。手編集なら省略（参照は変えない） */
  generationJobId?: string | null;
  sourceHash?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bill_contents").upsert(
    {
      bill_id: params.billId,
      difficulty_level: params.difficultyLevel,
      title: params.title,
      summary: params.summary,
      content: params.content,
      ...(params.generationJobId !== undefined && {
        generation_job_id: params.generationJobId,
        source_hash: params.sourceHash ?? null,
      }),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "bill_id,difficulty_level",
    }
  );

  if (error) {
    throw new Error(
      `Failed to upsert bill content (${params.difficultyLevel}): ${error.message}`
    );
  }
}

export async function findBillsTagsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("tag_id")
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill tags: ${error.message}`);
  }

  return data?.map((t) => t.tag_id) ?? [];
}

export async function deleteBillsTags(billId: string, tagIds: string[]) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bills_tags")
    .delete()
    .eq("bill_id", billId)
    .in("tag_id", tagIds);

  if (error) {
    throw new Error(`Failed to delete bill tags: ${error.message}`);
  }
}

export async function createBillsTags(billId: string, tagIds: string[]) {
  const supabase = createAdminClient();
  const billTags = tagIds.map((tagId) => ({
    bill_id: billId,
    tag_id: tagId,
  }));

  const { error } = await supabase.from("bills_tags").insert(billTags);

  if (error) {
    throw new Error(`Failed to create bill tags: ${error.message}`);
  }
}

export async function uploadBillThumbnailFile(params: {
  fileName: string;
  body: ArrayBuffer;
  contentType: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BILL_THUMBNAILS_BUCKET)
    .upload(params.fileName, params.body, {
      contentType: params.contentType,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`Failed to upload bill thumbnail: ${error.message}`);
  }

  return supabase.storage.from(BILL_THUMBNAILS_BUCKET).getPublicUrl(data.path)
    .data.publicUrl;
}

/** 議案のシェア画像に使った背景写真のファイル名（新しい順に最大 100 件） */
export async function listShareSourcePhotoNames(
  billId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BILL_THUMBNAILS_BUCKET)
    .list("", {
      search: `share-src_${billId}_`,
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });
  if (error) {
    console.error("Failed to list share source photos:", error);
    return [];
  }
  return (data ?? []).map((item) => item.name);
}

export function getBillThumbnailPublicUrl(fileName: string): string {
  const supabase = createAdminClient();
  return supabase.storage.from(BILL_THUMBNAILS_BUCKET).getPublicUrl(fileName)
    .data.publicUrl;
}

/** 議案の画像フォルダにあるテキストファイル（シェア画像の作り方など）。無ければ null */
export async function downloadBillThumbnailText(
  fileName: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BILL_THUMBNAILS_BUCKET)
    .download(fileName);
  if (error || !data) return null;
  return data.text();
}

/** シェア画像を設定している議案 */
export async function findBillsWithShareThumbnail(): Promise<
  { id: string; share_thumbnail_url: string | null }[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, share_thumbnail_url")
    .not("share_thumbnail_url", "is", null);
  if (error) {
    throw new Error(
      `Failed to fetch bills with share images: ${error.message}`
    );
  }
  return data ?? [];
}

/** シェア画像だけを差し替える（作り直したとき） */
export async function updateBillShareThumbnailUrl(
  billId: string,
  url: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bills")
    .update({ share_thumbnail_url: url })
    .eq("id", billId);
  if (error) {
    throw new Error(`Failed to update share image: ${error.message}`);
  }
}
