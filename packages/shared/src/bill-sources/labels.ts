/**
 * 一次資料（bill_sources.kind）の語彙と表示名。DB の enum bill_source_kind と一致させる。
 */
export const BILL_SOURCE_KINDS = [
  "bill_pdf",
  "agenda_pdf",
  "result_pdf",
  "committee_result_pdf",
  "minutes_plenary",
  "minutes_committee",
  "video",
  "newsletter",
  "city_page",
  "other",
] as const;
export type BillSourceKind = (typeof BILL_SOURCE_KINDS)[number];

export const BILL_SOURCE_KIND_LABELS: Record<BillSourceKind, string> = {
  bill_pdf: "議案書",
  agenda_pdf: "議事日程・付議事件",
  result_pdf: "審議結果",
  committee_result_pdf: "委員会の審査結果",
  minutes_plenary: "本会議の会議録",
  minutes_committee: "委員会の会議録",
  video: "中継・録画",
  newsletter: "議会だより",
  city_page: "市のページ",
  other: "その他",
};

/** 公開ページでの並び順（資料の種類ごと） */
export const BILL_SOURCE_KIND_ORDER: Record<BillSourceKind, number> = {
  bill_pdf: 0,
  agenda_pdf: 1,
  city_page: 2,
  minutes_committee: 3,
  committee_result_pdf: 4,
  minutes_plenary: 5,
  result_pdf: 6,
  video: 7,
  newsletter: 8,
  other: 9,
};

export type BillSourceLike = {
  kind: BillSourceKind;
  sort_order: number;
  meeting_date: string | null;
};

/** 表示順：sort_order → 種類 → 会議日 */
export function compareBillSources(a: BillSourceLike, b: BillSourceLike): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  const kindDiff = BILL_SOURCE_KIND_ORDER[a.kind] - BILL_SOURCE_KIND_ORDER[b.kind];
  if (kindDiff !== 0) return kindDiff;
  return (a.meeting_date ?? "").localeCompare(b.meeting_date ?? "");
}
