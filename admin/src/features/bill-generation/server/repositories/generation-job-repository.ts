import "server-only";

import type { StoredBillExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import type { GenerationJob } from "../../shared/types";

export async function createGenerationJob(params: {
  billId: string;
  kind: GenerationJob["kind"];
  model: string;
  promptVersion: string;
  inputHash: string;
  createdBy: string | null;
}): Promise<GenerationJob> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      bill_id: params.billId,
      kind: params.kind,
      model: params.model,
      prompt_version: params.promptVersion,
      input_hash: params.inputHash,
      status: "running",
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`生成ジョブの作成に失敗しました: ${error.message}`);
  }
  return data;
}

export async function markGenerationJobSucceeded(params: {
  jobId: string;
  output: StoredBillExplanation;
  costUsd: number | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("generation_jobs")
    .update({
      status: "succeeded",
      output: params.output as unknown as Json,
      cost_usd: params.costUsd,
      error: null,
    })
    .eq("id", params.jobId);

  if (error) {
    throw new Error(`生成結果の保存に失敗しました: ${error.message}`);
  }
}

export async function markGenerationJobFailed(params: {
  jobId: string;
  message: string;
  costUsd?: number | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      error: params.message.slice(0, 2000),
      cost_usd: params.costUsd ?? null,
    })
    .eq("id", params.jobId);

  if (error) {
    console.error("Failed to mark generation job failed:", error.message);
  }
}

export async function updateGenerationJobOutput(params: {
  jobId: string;
  output: StoredBillExplanation;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("generation_jobs")
    .update({ output: params.output as unknown as Json })
    .eq("id", params.jobId);

  if (error) {
    throw new Error(`生成結果の更新に失敗しました: ${error.message}`);
  }
}

export async function markGenerationJobReviewed(params: {
  jobId: string;
  reviewedBy: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("generation_jobs")
    .update({
      reviewed_by: params.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.jobId);

  if (error) {
    throw new Error(`確認記録の保存に失敗しました: ${error.message}`);
  }
}

export async function findGenerationJobById(
  jobId: string
): Promise<GenerationJob | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`生成ジョブの取得に失敗しました: ${error.message}`);
  }
  return data;
}

export async function findGenerationJobsByBillId(
  billId: string,
  limit = 20
): Promise<GenerationJob[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("bill_id", billId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`生成ジョブの取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}

/** 下書き（bill_contents）が参照している生成ジョブの id */
export async function findAppliedGenerationJobIds(
  billId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select("generation_job_id")
    .eq("bill_id", billId);

  if (error) {
    throw new Error(`解説の取得に失敗しました: ${error.message}`);
  }
  return [
    ...new Set(
      (data ?? [])
        .map((row) => row.generation_job_id)
        .filter((id): id is string => id !== null)
    ),
  ];
}

/** 期間内の生成コストの合計（USD） */
export async function sumGenerationCostUsd(params: {
  from: string;
  to: string;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("cost_usd")
    .gte("created_at", params.from)
    .lt("created_at", params.to);

  if (error) {
    throw new Error(`生成コストの集計に失敗しました: ${error.message}`);
  }
  return (data ?? []).reduce((sum, row) => {
    const value = Number(row.cost_usd);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}
