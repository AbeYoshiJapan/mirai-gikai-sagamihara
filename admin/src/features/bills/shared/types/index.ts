import type { DeliberationTiming } from "@mirai-gikai/shared/bill-stage/deliberation-timing";
import {
  getBillDecisionLabel,
  getBillOutcomeLabel,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { Database } from "@mirai-gikai/supabase";

export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export type BillStatus = Database["public"]["Enums"]["bill_status_enum"];
export type BillPublishStatus =
  Database["public"]["Enums"]["bill_publish_status"];
export type OriginatingHouse = Database["public"]["Enums"]["house_enum"];
export type BillArticleKind = Database["public"]["Enums"]["bill_article_kind"];

export type BillWithContent = Bill & {
  bill_content?: Database["public"]["Tables"]["bill_contents"]["Row"];
};

export type BillWithDietSession = Bill & {
  diet_sessions: { name: string } | null;
};

import type { SortConfig } from "@/lib/sort";

// ソート関連の型定義
export type BillSortField =
  | "created_at"
  | "submitted_date"
  | "status_order"
  | "publish_status_order";

export const BILL_SORT_FIELDS: readonly BillSortField[] = [
  "created_at",
  "submitted_date",
  "status_order",
  "publish_status_order",
] as const;

export type BillSortConfig = SortConfig<BillSortField>;

export const DEFAULT_BILL_SORT: BillSortConfig = {
  field: "created_at",
  order: "desc",
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatus, number> = {
  enacted: 0,
  rejected: 1,
  in_receiving_house: 2,
  in_originating_house: 3,
  introduced: 4,
  preparing: 5,
  reported: 6,
  plan: 7,
  special_committee: 8,
};

export const ARTICLE_KIND_LABELS: Record<BillArticleKind, string> = {
  standard: "通常版",
  ai_generated: "AI自動生成版",
};

/**
 * 一覧の審議状況ラベル。種類・段階・結果から決める（共通語彙）。
 * 議決済みなら「可決（賛成多数）」のように採決結果も添える。
 * 結論が出ていない議案は、時期（timing）で「審議中」「継続中」「審議予定」を出し分ける。
 */
export function getBillStageLabel(
  bill: {
    bill_kind: Bill["bill_kind"];
    stage: Bill["stage"];
    result: Bill["result"];
    vote_outcome: Bill["vote_outcome"];
  },
  timing?: DeliberationTiming | null
): string {
  return (
    getBillDecisionLabel(bill) ?? getBillOutcomeLabel(bill, undefined, timing)
  );
}
