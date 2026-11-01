import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { Committee, CommitteeInput } from "../../shared/types";

export async function findAllCommittees(): Promise<Committee[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`委員会の取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

export async function countCommittees(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("committees")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`委員会の件数取得に失敗しました: ${error.message}`);
  }
  return count ?? 0;
}

export async function createCommitteeRecord(
  input: CommitteeInput
): Promise<Committee> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`委員会の作成に失敗しました: ${error.message}`);
  }
  return data;
}

export async function insertCommitteeRecords(
  inputs: CommitteeInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("committees").insert(inputs);

  if (error) {
    throw new Error(`委員会の一括作成に失敗しました: ${error.message}`);
  }
}

export async function updateCommitteeRecord(
  id: string,
  input: CommitteeInput
): Promise<Committee> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`委員会の更新に失敗しました: ${error.message}`);
  }
  return data;
}

export async function deleteCommitteeRecord(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("committees").delete().eq("id", id);

  if (error) {
    throw new Error(`委員会の削除に失敗しました: ${error.message}`);
  }
}
