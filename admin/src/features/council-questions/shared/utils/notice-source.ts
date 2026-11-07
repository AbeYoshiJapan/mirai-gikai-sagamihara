/**
 * 通告一覧の PDF を探す議会サイトのページを決める。
 *
 * サイト設定「リンク」の「議案のページ」（相模原市議会では「提出議案・発言通告」）を使う。
 * 空なら、取込元のうち議案の PDF を読む設定（sagamihara_agenda_pdf）の URL。どちらも無ければ null。
 */
export function resolveNoticePageUrl(settings: {
  billsPage: string;
  importSources: { adapter: string; url: string; enabled: boolean }[];
}): string | null {
  const explicit = settings.billsPage.trim();
  if (/^https?:\/\//.test(explicit)) return explicit;
  const source = settings.importSources.find(
    (s) =>
      s.enabled &&
      s.adapter === "sagamihara_agenda_pdf" &&
      /^https?:\/\//.test(s.url)
  );
  return source?.url ?? null;
}
