import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

export async function findCommitteeNameById(
  committeeId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select("name")
    .eq("id", committeeId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data?.name ?? null;
}
