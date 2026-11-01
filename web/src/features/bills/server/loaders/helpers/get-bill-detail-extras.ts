import type {
  BillCommittee,
  BillSourceItem,
  BillVotes,
} from "../../../shared/types";
import {
  findBillSourcesByBillId,
  findCommitteeById,
  findVoteRecordsByBillId,
} from "../../repositories/bill-repository";

export type BillDetailExtras = {
  committee: BillCommittee | null;
  sources: BillSourceItem[];
  votes: BillVotes;
};

/**
 * 議案詳細に添える地方議会向けの情報（付託先・一次資料・賛否）をまとめて読む。
 */
export async function getBillDetailExtras(
  billId: string,
  committeeId: string | null
): Promise<BillDetailExtras> {
  const [committee, sources, votes] = await Promise.all([
    committeeId ? findCommitteeById(committeeId) : Promise.resolve(null),
    findBillSourcesByBillId(billId),
    findVoteRecordsByBillId(billId),
  ]);
  return { committee, sources, votes };
}
