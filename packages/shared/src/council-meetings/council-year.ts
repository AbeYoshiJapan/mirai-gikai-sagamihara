/**
 * 議会年度（開始月から翌年の開始月の前月まで）の開始年。
 * 相模原市議会は 4 月始まり（サイト設定 council.year_start_month）。令和8年度なら 2026。
 */
export function councilYearOf(date: Date, startMonth = 5): number {
  return date.getMonth() + 1 >= startMonth
    ? date.getFullYear()
    : date.getFullYear() - 1;
}

/** `YYYY-MM-DD` の議会年度 */
export function councilYearOfDateKey(dateKey: string, startMonth = 5): number {
  const [year, month] = dateKey.split("-").map(Number);
  return month >= startMonth ? year : year - 1;
}
