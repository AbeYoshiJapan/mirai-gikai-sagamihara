/**
 * 会議予定を取得する議会サイトのカレンダー（月のページ）の URL のひな形を決める。
 *
 * サイト設定「取込」→「カレンダーの月のページの URL」が入っていればそれを使う。
 * 空なら「議会の公式サイト」の URL に「top/{yyyy}/{mm}/」を足す（相模原市議会の形。
 * トップページの「前の月」「次の月」がこの形）。どちらも無ければ null。
 */
export function resolveCalendarMonthTemplate(settings: {
  calendarMonthUrl: string;
  councilSite: string;
}): string | null {
  const explicit = settings.calendarMonthUrl.trim();
  if (explicit) return explicit;
  const site = settings.councilSite.trim();
  if (!/^https?:\/\//.test(site)) return null;
  return `${site.replace(/\/+$/, "")}/top/{yyyy}/{mm}/`;
}
