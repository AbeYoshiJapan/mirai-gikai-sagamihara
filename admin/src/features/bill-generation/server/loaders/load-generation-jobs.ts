import "server-only";

import {
  countUnresolvedReviewPoints,
  parseStoredExplanation,
} from "@mirai-gikai/shared/bill-explanation/schema";
import type { GenerationJob, GenerationJobView } from "../../shared/types";
import { getJstMonthRange } from "../../shared/utils/cost-cap";
import {
  findAppliedGenerationJobIds,
  findGenerationJobById,
  findGenerationJobsByBillId,
  sumGenerationCostUsd,
} from "../repositories/generation-job-repository";

export function toGenerationJobView(
  job: GenerationJob,
  appliedIds: readonly string[]
): GenerationJobView {
  const { output, ...rest } = job;
  const explanation = parseStoredExplanation(output);
  return {
    ...rest,
    explanation,
    applied: appliedIds.includes(job.id),
    unresolved_count: countUnresolvedReviewPoints(explanation),
  };
}

export async function loadGenerationJobs(
  billId: string
): Promise<GenerationJobView[]> {
  const [jobs, appliedIds] = await Promise.all([
    findGenerationJobsByBillId(billId),
    findAppliedGenerationJobIds(billId),
  ]);
  return jobs.map((job) => toGenerationJobView(job, appliedIds));
}

export async function loadGenerationJob(
  jobId: string
): Promise<GenerationJobView | null> {
  const job = await findGenerationJobById(jobId);
  if (!job) return null;
  const appliedIds = await findAppliedGenerationJobIds(job.bill_id);
  return toGenerationJobView(job, appliedIds);
}

/** 今月（JST）の生成コスト */
export async function loadMonthlyGenerationCost(): Promise<number> {
  return sumGenerationCostUsd(getJstMonthRange(new Date()));
}

/**
 * 下書きに反映済みの生成のうち、未解決の「要確認」の数。
 * 0 でなければ記事を確認済みにも公開にもできない。
 */
export async function countUnresolvedReviewPointsForBill(
  billId: string
): Promise<number> {
  const appliedIds = await findAppliedGenerationJobIds(billId);
  let total = 0;
  for (const id of appliedIds) {
    const job = await findGenerationJobById(id);
    if (!job) continue;
    total += countUnresolvedReviewPoints(parseStoredExplanation(job.output));
  }
  return total;
}
