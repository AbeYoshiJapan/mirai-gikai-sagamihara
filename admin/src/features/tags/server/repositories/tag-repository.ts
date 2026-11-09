import "server-only";

import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";
import { isMissingSchemaError } from "@mirai-gikai/shared/db/missing-schema-error";

type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];

export async function findAllTagsWithBillCount() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select(
      `
      id,
      label,
      description,
      featured_priority,
      is_theme,
      theme_order,
      created_at,
      updated_at,
      bills_tags(count)
    `
    )
    .order("featured_priority", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    // DB の更新（テーマの列の追加）より先にデプロイされても、議案の編集やタグ管理が止まらないようにする
    if (isMissingSchemaError(error)) return findAllTagsWithoutThemeColumns();
    throw new Error(`タグの取得に失敗しました: ${error.message}`);
  }

  return data;
}

/** テーマの列がまだ無い DB 向け。テーマは「公開しない」として返す */
async function findAllTagsWithoutThemeColumns() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select(
      `
      id,
      label,
      description,
      featured_priority,
      created_at,
      updated_at,
      bills_tags(count)
    `
    )
    .order("featured_priority", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`タグの取得に失敗しました: ${error.message}`);
  }

  return (data ?? []).map((tag) => ({
    ...tag,
    is_theme: false,
    theme_order: 0,
  }));
}

export async function createTagRecord(input: {
  label: string;
  description?: string | null;
  featured_priority?: number | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({
      label: input.label,
      description: input.description ?? null,
      featured_priority: input.featured_priority ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        data: null,
        error: { code: error.code, message: error.message },
      };
    }
    throw new Error(`タグの作成に失敗しました: ${error.message}`);
  }

  return { data, error: null };
}

export async function updateTagRecord(
  id: string,
  input: {
    label?: string;
    description?: string | null;
    featured_priority?: number | null;
    is_theme?: boolean;
    theme_order?: number;
  }
) {
  const supabase = createAdminClient();

  // PATCH方式: undefinedのフィールドはupdate対象に含めず既存値を維持する
  const updateData: TagUpdate = {};
  if (input.label !== undefined) updateData.label = input.label;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.featured_priority !== undefined)
    updateData.featured_priority = input.featured_priority;
  if (input.is_theme !== undefined) updateData.is_theme = input.is_theme;
  if (input.theme_order !== undefined)
    updateData.theme_order = input.theme_order;

  if (Object.keys(updateData).length === 0) {
    return {
      data: null,
      error: {
        code: "EMPTY_UPDATE",
        message: "更新するフィールドがありません",
      },
    };
  }

  const { data, error } = await supabase
    .from("tags")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        data: null,
        error: { code: error.code, message: error.message },
      };
    }
    if (error.code === "PGRST116") {
      return {
        data: null,
        error: { code: error.code, message: error.message },
      };
    }
    if (isMissingSchemaError(error)) {
      // テーマの列は DB の更新（db push）で入る
      return {
        data: null,
        error: { code: "MISSING_THEME_COLUMNS", message: error.message },
      };
    }
    throw new Error(`タグの更新に失敗しました: ${error.message}`);
  }

  return { data, error: null };
}

export async function deleteTagRecord(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) {
    if (error.code === "PGRST116") {
      return { error: { code: error.code, message: error.message } };
    }
    throw new Error(`タグの削除に失敗しました: ${error.message}`);
  }

  return { error: null };
}
