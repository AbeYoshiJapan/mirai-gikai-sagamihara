import "server-only";

import type { Committee } from "../../shared/types";
import { findAllCommittees } from "../repositories/committee-repository";

export async function loadCommittees(): Promise<Committee[]> {
  return findAllCommittees();
}

/** 議案の付託先の選択肢（有効なものだけ） */
export async function loadActiveCommittees(): Promise<Committee[]> {
  const all = await findAllCommittees();
  return all.filter((c) => c.is_active);
}
