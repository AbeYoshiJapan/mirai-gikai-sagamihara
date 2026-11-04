import { z } from "zod";
import {
  BILL_KINDS,
  BILL_RESULTS,
  PROPOSER_KINDS,
  VOTE_OUTCOMES,
} from "../bill-stage/labels";

/**
 * 取込 JSON（tools/import が出力する mirai-gikai-import/1）の形。
 * Python 側の gikai_import/model.py と対応させる。
 */
export const IMPORT_FORMAT = "mirai-gikai-import/1";

export const IMPORT_NUMBER_KINDS = [
  "bill",
  "member_bill",
  "committee_bill",
  "petition",
  "request",
] as const;
export type ImportNumberKind = (typeof IMPORT_NUMBER_KINDS)[number];

export const IMPORT_NUMBER_KIND_LABELS: Record<ImportNumberKind, string> = {
  bill: "議案",
  member_bill: "議提議案",
  committee_bill: "委員会提出議案",
  petition: "陳情",
  request: "請願",
};

export const IMPORT_TEXT_QUALITIES = [
  "text",
  "ocr",
  "mixed",
  "book",
  "none",
] as const;
export type ImportTextQuality = (typeof IMPORT_TEXT_QUALITIES)[number];

export const IMPORT_TEXT_QUALITY_LABELS: Record<ImportTextQuality, string> = {
  text: "文字あり",
  ocr: "OCR",
  mixed: "一部 OCR",
  book: "冊子（冒頭のみ）",
  none: "文字なし",
};

/** 解説生成に渡せる上限と同じ */
export const IMPORT_MAX_TEXT_CHARS = 60_000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableIsoDate = isoDate.nullable();

export const importSourceFileSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().nullable().default(null),
  sha256: z.string().max(64).nullable().default(null),
  pages: z.number().int().min(0).nullable().default(null),
  label: z.string().max(200).nullable().default(null),
});

export const importMeetingSchema = z.object({
  council_year: z.number().int().min(1990).max(2100).nullable().default(null),
  era_year_label: z.string().max(20).nullable().default(null),
  session_name: z.string().max(100).nullable().default(null),
  label: z.string().max(100).nullable().default(null),
  as_of: nullableIsoDate.default(null),
});

export const importDocumentSchema = z.object({
  url: z.string().url().nullable().default(null),
  file: z.string().max(200).nullable().default(null),
  pages: z.array(z.number().int().min(1)).length(2).nullable().default(null),
  title: z.string().max(500).nullable().default(null),
  text: z.string().max(IMPORT_MAX_TEXT_CHARS).default(""),
  text_quality: z.enum(IMPORT_TEXT_QUALITIES).default("none"),
  proposal_reason: z.string().max(10_000).nullable().default(null),
  materials_text: z.string().max(IMPORT_MAX_TEXT_CHARS).nullable().default(null),
  sha256: z.string().max(64).nullable().default(null),
  truncated: z.boolean().default(false),
});

export const importItemSchema = z.object({
  key: z.string().min(1).max(60),
  kind: z.enum(IMPORT_NUMBER_KINDS),
  number: z.number().int().min(0),
  number_label: z.string().min(1).max(40),
  number_year: z.number().int().min(1990).max(2100),
  citation: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  bill_kind: z.enum(BILL_KINDS),
  proposer_kind: z.enum(PROPOSER_KINDS),
  committees: z.array(z.string().max(60)).max(10).default([]),
  subcommittees: z.array(z.string().max(60)).max(10).default([]),
  added_this_time: z.boolean().default(false),
  carried_over: z.boolean().default(false),
  submitted_on: nullableIsoDate.default(null),
  proposers: z.array(z.string().max(60)).max(60).default([]),
  category_hint: z.string().max(60).nullable().default(null),
  document: importDocumentSchema.nullable().default(null),
  warnings: z.array(z.string().max(500)).max(20).default([]),
});

export const importResultSchema = z.object({
  key: z.string().min(1).max(60),
  kind: z.enum(IMPORT_NUMBER_KINDS),
  number: z.number().int().min(0),
  number_label: z.string().min(1).max(40),
  number_year: z.number().int().min(1990).max(2100),
  citation: z.string().min(1).max(50),
  name: z.string().max(200).default(""),
  committees: z.array(z.string().max(60)).max(10).default([]),
  decided_on: nullableIsoDate.default(null),
  result: z.enum(BILL_RESULTS).nullable().default(null),
  vote_outcome: z.enum(VOTE_OUTCOMES).nullable().default(null),
  raw_result: z.string().max(100).default(""),
  warnings: z.array(z.string().max(500)).max(20).default([]),
});

export const importBundleSchema = z.object({
  format: z.literal(IMPORT_FORMAT),
  generated_at: z.string().max(40),
  source: z.object({
    adapter: z.string().min(1).max(60),
    url: z.string().url().nullable().default(null),
    files: z.array(importSourceFileSchema).max(100).default([]),
  }),
  meeting: importMeetingSchema,
  items: z.array(importItemSchema).max(500).default([]),
  results: z.array(importResultSchema).max(500).default([]),
  warnings: z.array(z.string().max(500)).max(200).default([]),
});

export type ImportBundle = z.infer<typeof importBundleSchema>;
export type ImportItem = z.infer<typeof importItemSchema>;
export type ImportResultItem = z.infer<typeof importResultSchema>;
export type ImportDocument = z.infer<typeof importDocumentSchema>;
export type ImportSourceFile = z.infer<typeof importSourceFileSchema>;

export type ParseImportBundleResult =
  | { ok: true; bundle: ImportBundle }
  | { ok: false; error: string };

/** JSON 文字列を検証して取込 JSON にする。形式違いや壊れた JSON は理由を返す */
export function parseImportBundle(json: string): ParseImportBundleResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON として読めません" };
  }
  const result = importBundleSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "(root)";
    return {
      ok: false,
      error: `取込 JSON の形が違います（${path}: ${issue?.message ?? "不正"}）`,
    };
  }
  return { ok: true, bundle: result.data };
}
