import "server-only";

import { createHash } from "node:crypto";
import {
  appendSourcesBlock,
  buildBillExplanationPrompt,
  buildSourcesBlock,
  type ExplanationPromptSource,
} from "@mirai-gikai/shared/bill-explanation/prompt";
import {
  billExplanationSchema,
  type StoredBillExplanation,
  toStoredExplanation,
} from "@mirai-gikai/shared/bill-explanation/schema";
import { BILL_SOURCE_KIND_LABELS } from "@mirai-gikai/shared/bill-sources/labels";
import {
  BILL_KIND_LABELS,
  PROPOSER_KIND_LABELS,
} from "@mirai-gikai/shared/bill-stage/labels";
import { generateObject } from "ai";
import { findBillSourcesByBillId } from "@/features/bill-sources/server/repositories/bill-source-repository";
import { findBillById } from "@/features/bills-edit/server/repositories/bill-edit-repository";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { findAllTagsWithBillCount } from "@/features/tags/server/repositories/tag-repository";
import {
  getJstMonthRange,
  isOverMonthlyCap,
} from "../../shared/utils/cost-cap";
import { calculateGenerationCostUsd } from "../../shared/utils/generation-cost";
import { findCommitteeNameById } from "../repositories/committee-name-repository";
import {
  createGenerationJob,
  markGenerationJobFailed,
  markGenerationJobSucceeded,
  sumGenerationCostUsd,
} from "../repositories/generation-job-repository";

export type GenerateExplanationParams = {
  billId: string;
  /** 管理者が貼り付けた補足資料 */
  extraText: string | null;
  createdBy: string | null;
};

export type GenerateExplanationResult =
  | {
      jobId: string;
      explanation: StoredBillExplanation;
      costUsd: number | null;
    }
  | { error: string };

function extractGatewayCost(providerMetadata: unknown): number | undefined {
  if (!providerMetadata || typeof providerMetadata !== "object")
    return undefined;
  const cost = (providerMetadata as { gateway?: { cost?: unknown } }).gateway
    ?.cost;
  const numeric = Number(cost);
  return Number.isFinite(numeric) ? numeric : undefined;
}

/**
 * 一次資料から解説を生成し、generation_jobs に記録する。
 * 生成結果は下書きにも公開にも自動では反映しない（管理者が画面で確認して反映する）。
 */
export async function generateBillExplanation(
  params: GenerateExplanationParams
): Promise<GenerateExplanationResult> {
  const [bill, sources, { settings }, tags] = await Promise.all([
    findBillById(params.billId),
    findBillSourcesByBillId(params.billId),
    loadSiteSettings(),
    findAllTagsWithBillCount(),
  ]);

  const hasAnyInput =
    sources.some((s) => s.extracted_text?.trim()) ||
    Boolean(params.extraText?.trim()) ||
    Boolean(bill.knowledge_source?.trim());
  if (!hasAnyInput) {
    return {
      error:
        "一次資料の本文がありません。議案書の本文を貼り付けるか、取込で本文を取得してから生成してください",
    };
  }

  const model = settings.ai.generation_model.trim();
  if (!model) {
    return { error: "生成に使うモデルが未設定です（サイト設定 → AI 生成）" };
  }

  // 月次コスト上限
  const range = getJstMonthRange(new Date());
  const monthCost = await sumGenerationCostUsd(range);
  if (isOverMonthlyCap(monthCost, settings.ai.monthly_total_usd_limit)) {
    return {
      error: `今月の生成コストが上限（${settings.ai.monthly_total_usd_limit} USD）に達しています。サイト設定で上限を見直すか、来月まで待ってください`,
    };
  }

  const committeeName = bill.committee_id
    ? await findCommitteeNameById(bill.committee_id)
    : null;

  const promptSources: ExplanationPromptSource[] = sources.map((s) => ({
    kind_label: BILL_SOURCE_KIND_LABELS[s.kind],
    label: s.label,
    url: s.url,
    meeting_date: s.meeting_date,
    text: s.extracted_text?.trim() ? s.extracted_text : null,
  }));

  const extraText = [params.extraText, bill.knowledge_source]
    .filter((t): t is string => Boolean(t?.trim()))
    .join("\n\n");

  const { system, user } = buildBillExplanationPrompt({
    bill: {
      name: bill.name,
      bill_number: bill.bill_number,
      kind_label: BILL_KIND_LABELS[bill.bill_kind],
      proposer_label: PROPOSER_KIND_LABELS[bill.proposer_kind],
      committee_name: committeeName,
      submitted_date: bill.submitted_date
        ? bill.submitted_date.slice(0, 10)
        : null,
      status_note: bill.status_note,
    },
    sources: promptSources,
    extra_text: extraText || null,
    existing_tags: tags.map((t) => t.label),
    context: {
      council_name: settings.council.name,
      municipality: settings.council.municipality,
      resident_label: settings.council.resident_label,
      session_label: settings.council.session_label,
      primary_source_label: settings.council.primary_source_label,
    },
  });

  const inputHash = createHash("sha256")
    .update(`${model}\n${settings.ai.generation_prompt_version}\n${user}`)
    .digest("hex");

  const job = await createGenerationJob({
    billId: params.billId,
    kind: "content_normal",
    model,
    promptVersion: settings.ai.generation_prompt_version,
    inputHash,
    createdBy: params.createdBy,
  });

  try {
    const result = await generateObject({
      model,
      schema: billExplanationSchema,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
    });

    const costUsd =
      extractGatewayCost(result.providerMetadata) ??
      calculateGenerationCostUsd(model, result.usage);

    const sourcesBlock = buildSourcesBlock(
      promptSources,
      settings.council.primary_source_label
    );
    const stored = toStoredExplanation(result.object, sourcesBlock);

    await markGenerationJobSucceeded({
      jobId: job.id,
      output: stored,
      costUsd,
    });

    return { jobId: job.id, explanation: stored, costUsd };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markGenerationJobFailed({ jobId: job.id, message });
    console.error("[bill-generation] failed:", error);
    return { error: `生成に失敗しました: ${message}` };
  }
}

/** 下書きへ反映するときの本文。出典ブロックを末尾に付ける */
export function buildDraftContent(
  explanation: StoredBillExplanation,
  difficulty: "normal" | "hard"
): { title: string; summary: string; content: string } {
  const version = explanation[difficulty];
  return {
    title: version.title,
    summary: version.summary,
    content: appendSourcesBlock(version.content, explanation.sources_block),
  };
}
