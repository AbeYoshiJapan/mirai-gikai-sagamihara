import type { LanguageModelUsage } from "ai";

type Pricing = { inputPerMillion: number; outputPerMillion: number };

/**
 * モデルごとの料金（USD / 1M トークン）。AI Gateway が cost を返さなかったときの概算用。
 * web/src/lib/ai/calculate-ai-cost.ts と同じ値を保つ。
 */
const MODEL_PRICING: Record<string, Pricing> = {
  "openai/gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "openai/gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "openai/gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "openai/gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "openai/gpt-4.1-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "openai/gpt-5": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "openai/gpt-5-mini": { inputPerMillion: 0.25, outputPerMillion: 2 },
  "openai/gpt-5-nano": { inputPerMillion: 0.05, outputPerMillion: 0.4 },
  "openai/gpt-5.1-instant": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "openai/gpt-5.1-thinking": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "openai/gpt-5.2": { inputPerMillion: 1.75, outputPerMillion: 14 },
  "google/gemini-3-flash": { inputPerMillion: 0.5, outputPerMillion: 3 },
  "google/gemini-3.1-pro-preview": { inputPerMillion: 2, outputPerMillion: 12 },
  "anthropic/claude-haiku-4.5": { inputPerMillion: 1, outputPerMillion: 5 },
  "anthropic/claude-sonnet-4.6": { inputPerMillion: 3, outputPerMillion: 15 },
  "anthropic/claude-sonnet-5": { inputPerMillion: 3, outputPerMillion: 15 },
  "anthropic/claude-opus-4.6": { inputPerMillion: 15, outputPerMillion: 75 },
};

/**
 * 使用トークンから概算コストを出す。料金表に無いモデルは null（不明）。
 */
export function calculateGenerationCostUsd(
  model: string,
  usage: Pick<LanguageModelUsage, "inputTokens" | "outputTokens"> | undefined
): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing || !usage) return null;
  const input = Number(usage.inputTokens ?? 0);
  const output = Number(usage.outputTokens ?? 0);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  const cost =
    (input / 1_000_000) * pricing.inputPerMillion +
    (output / 1_000_000) * pricing.outputPerMillion;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
