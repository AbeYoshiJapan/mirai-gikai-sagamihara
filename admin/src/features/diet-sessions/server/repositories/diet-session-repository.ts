import "server-only";

import type { MeetingPeriod } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import { createAdminClient } from "@mirai-gikai/supabase";

/**
 * DB のエラーを運営者向けの文に直す。
 * スラッグの重複（unique 制約 diet_sessions_slug_key）は起きやすいので、原因と直し方を書く。
 */
function describeDietSessionError(
  error: { code?: string; message: string },
  action: string
): string {
  if (error.code === "23505" && error.message.includes("slug")) {
    return `スラッグが別の会期ですでに使われています。会期ごとに違うスラッグ（例: r8、r7）にするか、空欄にしてください。通年議会で定例会議を登録する場合は、会期を追加せず、年度の会期を「編集」して「定例会議などの期間」に入れてください`;
  }
  return `会期の${action}に失敗しました: ${error.message}`;
}

export async function findAllDietSessions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(`会期の取得に失敗しました: ${error.message}`);
  }

  return data;
}

export async function createDietSessionRecord(input: {
  name: string;
  slug: string | null;
  shugiin_url: string | null;
  start_date: string;
  end_date: string;
  meeting_periods: MeetingPeriod[];
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .insert({
      name: input.name,
      slug: input.slug,
      shugiin_url: input.shugiin_url,
      start_date: input.start_date,
      end_date: input.end_date,
      meeting_periods: input.meeting_periods,
    })
    .select()
    .single();

  if (error) {
    throw new Error(describeDietSessionError(error, "作成"));
  }

  return data;
}

export async function updateDietSessionRecord(
  id: string,
  input: {
    name: string;
    slug: string | null;
    shugiin_url: string | null;
    start_date: string;
    end_date: string;
    meeting_periods: MeetingPeriod[];
  }
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .update({
      name: input.name,
      slug: input.slug,
      shugiin_url: input.shugiin_url,
      start_date: input.start_date,
      end_date: input.end_date,
      meeting_periods: input.meeting_periods,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(describeDietSessionError(error, "更新"));
  }

  return data;
}

export async function deleteDietSessionRecord(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("diet_sessions").delete().eq("id", id);

  if (error) {
    throw new Error(`会期の削除に失敗しました: ${error.message}`);
  }
}

export async function setActiveDietSessionRecord(id: string) {
  const supabase = createAdminClient();
  const { error: rpcError } = await supabase.rpc("set_active_diet_session", {
    target_session_id: id,
  });

  if (rpcError) {
    throw new Error(
      `アクティブセッションの設定に失敗しました: ${rpcError.message}`
    );
  }
}

export async function findDietSessionById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diet_sessions")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`セッション情報の取得に失敗しました: ${error.message}`);
  }

  return data;
}
