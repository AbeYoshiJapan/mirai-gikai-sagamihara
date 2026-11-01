import { BILL_SOURCE_KINDS } from "@mirai-gikai/shared/bill-sources/labels";
import type { Database } from "@mirai-gikai/supabase";
import { z } from "zod";

export type BillSource = Database["public"]["Tables"]["bill_sources"]["Row"];

export const billSourceInputSchema = z.object({
  kind: z.enum(BILL_SOURCE_KINDS),
  url: z
    .string()
    .trim()
    .min(1, "URL を入力してください")
    .refine(
      (v) => /^https?:\/\//.test(v),
      "http(s):// から始まる URL を入力してください"
    ),
  label: z.string().trim().max(120, "表示名は120文字以内で入力してください"),
  meeting_date: z
    .string()
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "会議日は YYYY-MM-DD 形式で入力してください"
    ),
  sort_order: z.number().int().min(0).max(999),
});

export type BillSourceInput = z.infer<typeof billSourceInputSchema>;
