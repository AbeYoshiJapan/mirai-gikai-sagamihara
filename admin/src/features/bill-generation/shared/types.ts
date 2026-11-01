import type { StoredBillExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import type { Database } from "@mirai-gikai/supabase";

export type GenerationJob =
  Database["public"]["Tables"]["generation_jobs"]["Row"];
export type GenerationJobStatus =
  Database["public"]["Enums"]["generation_job_status"];

export const GENERATION_STATUS_LABELS: Record<GenerationJobStatus, string> = {
  queued: "待機中",
  running: "生成中",
  succeeded: "完了",
  failed: "失敗",
  discarded: "破棄",
};

/** 画面用：出力を検証済みの形で持つ */
export type GenerationJobView = Omit<GenerationJob, "output"> & {
  explanation: StoredBillExplanation | null;
  /** この生成が下書き（bill_contents）に反映されているか */
  applied: boolean;
  unresolved_count: number;
};
