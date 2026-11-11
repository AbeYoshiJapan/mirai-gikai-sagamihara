import type { ImportPlan } from "@mirai-gikai/shared/import/plan";
import { z } from "zod";

/** 取込 JSON は数 MB になるので上限を設ける（Server Action の bodySizeLimit は 8MB） */
export const IMPORT_JSON_MAX_BYTES = 6 * 1024 * 1024;

export const previewImportInputSchema = z.object({
  bundleJson: z.string().min(2).max(IMPORT_JSON_MAX_BYTES),
  sessionId: z.string().uuid("会期を選んでください"),
});
export type PreviewImportInput = z.infer<typeof previewImportInputSchema>;

export const applyImportInputSchema = previewImportInputSchema.extend({
  /** 適用する項目（citation）。省略なら計画の create/update すべて */
  citations: z.array(z.string().max(50)).max(500).optional(),
});
export type ApplyImportInput = z.infer<typeof applyImportInputSchema>;

export type ImportPreview = {
  plan: ImportPlan;
  meeting: {
    session_name: string | null;
    label: string | null;
    as_of: string | null;
    adapter: string;
  };
  bundleWarnings: string[];
  /** 取込の決まりごとの説明（提出日の入れ方など）。注意ではない */
  notes: string[];
};

export type PreviewImportResult =
  | { success: true; preview: ImportPreview }
  | { error: string };

export type ApplyImportSummary = {
  runId: string | null;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type ApplyImportResult =
  | { success: true; summary: ApplyImportSummary }
  | { error: string };

export type ImportRunView = {
  id: string;
  source_id: string;
  adapter: string;
  status: string;
  dry_run: boolean;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown>;
  log: string | null;
};
