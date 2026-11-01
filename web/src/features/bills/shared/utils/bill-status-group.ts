import {
  BILL_STAGE_GROUP_LABELS,
  BILL_STAGE_GROUPS,
  type BillStageGroup,
  isBillStageGroup,
  toBillStageGroup,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { BillStageFields } from "./bill-status";
import { toStageInfo } from "./bill-status";

/**
 * 議案一覧の絞り込みで使うグループ。
 *
 * 種類（bill_kind）・段階（stage）・結果（result）を、一覧のタブ用に束ねる。
 * 値は URL のクエリになるので共通語彙（packages/shared/bill-stage）に合わせて固定。
 */
export const BILL_STATUS_GROUPS = BILL_STAGE_GROUPS;
export type BillStatusGroup = BillStageGroup;
export const BILL_STATUS_GROUP_LABELS = BILL_STAGE_GROUP_LABELS;

export function toBillStatusGroup(
  bill: BillStageFields
): Exclude<BillStatusGroup, "all"> {
  return toBillStageGroup(toStageInfo(bill));
}

/** 文字列をグループに絞り込む型ガード。URL 直打ちで壊れないようにする。 */
export function isBillStatusGroup(value: unknown): value is BillStatusGroup {
  return isBillStageGroup(value);
}

/** グループごとの件数。呼び出し側が渡した母集合をそのまま数える。 */
export function countByStatusGroup(
  bills: readonly BillStageFields[]
): Record<BillStatusGroup, number> {
  const counts: Record<BillStatusGroup, number> = {
    all: bills.length,
    deliberating: 0,
    waiting: 0,
    enacted: 0,
    rejected: 0,
    reported: 0,
    plan: 0,
    special_committee: 0,
  };
  for (const bill of bills) {
    counts[toBillStatusGroup(bill)] += 1;
  }
  return counts;
}

/** グループで絞る。`all` は素通し。 */
export function filterByStatusGroup<T extends BillStageFields>(
  bills: readonly T[],
  group: BillStatusGroup
): T[] {
  if (group === "all") return [...bills];
  return bills.filter((bill) => toBillStatusGroup(bill) === group);
}
