import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { BillSource, BillSourceInput } from "../../shared/types";

function toRow(input: BillSourceInput) {
  return {
    kind: input.kind,
    url: input.url,
    label: input.label,
    meeting_date: input.meeting_date || null,
    sort_order: input.sort_order,
  };
}

export async function findBillSourcesByBillId(
  billId: string
): Promise<BillSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_sources")
    .select("*")
    .eq("bill_id", billId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`一次資料の取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

export async function createBillSourceRecord(
  billId: string,
  input: BillSourceInput
): Promise<BillSource> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_sources")
    .insert({ bill_id: billId, ...toRow(input) })
    .select()
    .single();

  if (error) {
    throw new Error(`一次資料の追加に失敗しました: ${error.message}`);
  }
  return data;
}

export async function updateBillSourceRecord(
  id: string,
  input: BillSourceInput
): Promise<BillSource> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_sources")
    .update(toRow(input))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`一次資料の更新に失敗しました: ${error.message}`);
  }
  return data;
}

export async function deleteBillSourceRecord(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("bill_sources").delete().eq("id", id);

  if (error) {
    throw new Error(`一次資料の削除に失敗しました: ${error.message}`);
  }
}
