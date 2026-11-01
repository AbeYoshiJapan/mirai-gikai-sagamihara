import "server-only";

import type { BillSource } from "../../shared/types";
import { findBillSourcesByBillId } from "../repositories/bill-source-repository";

export async function getBillSources(billId: string): Promise<BillSource[]> {
  return findBillSourcesByBillId(billId);
}
