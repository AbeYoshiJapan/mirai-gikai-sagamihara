import type { Database } from "@mirai-gikai/supabase";
import { z } from "zod";

export type Committee = Database["public"]["Tables"]["committees"]["Row"];
export type CommitteeKind = Database["public"]["Enums"]["committee_kind"];

export const COMMITTEE_KIND_LABELS: Record<CommitteeKind, string> = {
  standing: "常任委員会",
  special: "特別委員会",
  steering: "議会運営委員会",
  budget: "予算特別委員会",
  settlement: "決算特別委員会",
  other: "その他",
};

export const committeeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "委員会名を入力してください")
    .max(60, "委員会名は60文字以内で入力してください"),
  short_name: z.string().trim().max(20, "略称は20文字以内で入力してください"),
  kind: z.enum([
    "standing",
    "special",
    "steering",
    "budget",
    "settlement",
    "other",
  ]),
  sort_order: z.number().int().min(0).max(999),
  is_active: z.boolean(),
});

export type CommitteeInput = z.infer<typeof committeeInputSchema>;
