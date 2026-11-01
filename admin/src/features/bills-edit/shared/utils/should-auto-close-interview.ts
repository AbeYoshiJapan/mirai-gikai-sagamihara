import type { BillUpdateInput } from "../types";

/**
 * 議案の更新で、関連する公開中インタビューを自動クローズすべきかを判定する。
 * 議決が確定（stage=decided で継続審査以外）したとき。
 * 旧来の status=enacted（国会由来の経路）でも同じ扱い。
 */
export function shouldAutoCloseInterviewOnBillStage(input: {
  stage?: BillUpdateInput["stage"];
  result?: BillUpdateInput["result"];
  status?: BillUpdateInput["status"];
}): boolean {
  if (input.stage === "decided") {
    return input.result !== "continued";
  }
  return input.status === "enacted";
}
