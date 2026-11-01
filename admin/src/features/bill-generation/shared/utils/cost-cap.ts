/**
 * 月次コスト上限の判定（純粋関数）。limit が 0 以下なら無制限。
 */
export function isOverMonthlyCap(
  monthCostUsd: number,
  limitUsd: number
): boolean {
  if (!Number.isFinite(limitUsd) || limitUsd <= 0) return false;
  return monthCostUsd >= limitUsd;
}

/** JST の今月の範囲（ISO）。開始は含み、終了は含まない */
export function getJstMonthRange(now: Date): { from: string; to: string } {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1) - 9 * 60 * 60 * 1000);
  const to = new Date(Date.UTC(year, month + 1, 1) - 9 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
