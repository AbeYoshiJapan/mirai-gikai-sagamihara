import { SAGAMIHARA_COMMITTEES } from "@mirai-gikai/shared/site-settings/presets";
import type { Database } from "@mirai-gikai/supabase";

type CommitteeInsert = Database["public"]["Tables"]["committees"]["Insert"];
type FactionInsert = Database["public"]["Tables"]["factions"]["Insert"];
type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];
type VoteRecordInsert = Database["public"]["Tables"]["vote_records"]["Insert"];
type BillSourceInsert = Database["public"]["Tables"]["bill_sources"]["Insert"];
type CouncilMeetingInsert =
  Database["public"]["Tables"]["council_meetings"]["Insert"];

/** 委員会（相模原市議会のプリセットと同じ） */
export const committees: CommitteeInsert[] = SAGAMIHARA_COMMITTEES.map((c) => ({
  ...c,
  is_active: true,
}));

/** 議案の種類・名前から付託先を決める（開発用の割り当て） */
export function committeeNameForBill(bill: {
  name: string;
  bill_kind?: string | null;
}): string | null {
  if (bill.bill_kind === "budget") return "予算特別委員会";
  if (bill.name.includes("給食") || bill.name.includes("中学校")) {
    return "こども文教委員会";
  }
  if (bill.bill_kind === "report" || bill.bill_kind === "plan") return null;
  return "総務委員会";
}

/** 会派（架空） */
export const factions: FactionInsert[] = [
  { name: "さがみはら市民クラブ", short_name: "市民ク", sort_order: 1 },
  { name: "未来創造の会", short_name: "未来", sort_order: 2 },
  { name: "みどりと暮らし", short_name: "みどり", sort_order: 3 },
  { name: "無所属", short_name: "無所属", sort_order: 4 },
];

/** 議員（架空。会派名で紐づける） */
export const members: (Omit<MemberInsert, "faction_id"> & {
  faction_name: string;
})[] = [
  { name: "相模 太郎", kana: "さがみ たろう", ward: "緑区", faction_name: "さがみはら市民クラブ", sort_order: 1 },
  { name: "橋本 花子", kana: "はしもと はなこ", ward: "緑区", faction_name: "さがみはら市民クラブ", sort_order: 2 },
  { name: "淵野辺 健", kana: "ふちのべ けん", ward: "中央区", faction_name: "未来創造の会", sort_order: 3 },
  { name: "矢部 みどり", kana: "やべ みどり", ward: "中央区", faction_name: "みどりと暮らし", sort_order: 4 },
  { name: "古淵 誠", kana: "こぶち まこと", ward: "南区", faction_name: "無所属", sort_order: 5 },
];

/** 会派ごとの賛否（議案名で紐づける） */
export const factionVotes: {
  bill_name: string;
  votes: { faction_name: string; vote: VoteRecordInsert["vote"] }[];
}[] = [
  {
    bill_name: "令和8年度相模原市一般会計補正予算（子育て支援）",
    votes: [
      { faction_name: "さがみはら市民クラブ", vote: "for" },
      { faction_name: "未来創造の会", vote: "for" },
      { faction_name: "みどりと暮らし", vote: "against" },
      { faction_name: "無所属", vote: "for" },
    ],
  },
  {
    bill_name: "相模原市若者の市政参加推進条例",
    votes: [
      { faction_name: "さがみはら市民クラブ", vote: "against" },
      { faction_name: "未来創造の会", vote: "for" },
      { faction_name: "みどりと暮らし", vote: "for" },
      { faction_name: "無所属", vote: "against" },
    ],
  },
];

/** 議員ごとの賛否（議案名で紐づける） */
export const memberVotes: {
  bill_name: string;
  votes: { member_name: string; vote: VoteRecordInsert["vote"] }[];
}[] = [
  {
    bill_name: "相模原市若者の市政参加推進条例",
    votes: [
      { member_name: "相模 太郎", vote: "against" },
      { member_name: "橋本 花子", vote: "against" },
      { member_name: "淵野辺 健", vote: "for" },
      { member_name: "矢部 みどり", vote: "for" },
      { member_name: "古淵 誠", vote: "abstain" },
    ],
  },
];

/** 一次資料（議案名で紐づける） */
export const billSources: {
  bill_name: string;
  sources: Omit<BillSourceInsert, "bill_id">[];
}[] = [
  {
    bill_name: "相模原市公共交通燃料費支援条例",
    sources: [
      {
        kind: "bill_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2013120900011/",
        label: "議案書（9月定例会議）",
        sort_order: 0,
      },
      {
        kind: "minutes_committee",
        url: "https://ssp.kaigiroku.net/tenant/sagamihara/SpMinuteSearch.html",
        label: "総務委員会（9月5日）",
        meeting_date: "2026-09-05",
        sort_order: 1,
      },
      {
        kind: "video",
        url: "https://www.sagamihara-shigikai.jp/doc/2017051800044/",
        label: "本会議中継（9月定例会議 初日）",
        meeting_date: "2026-08-27",
        sort_order: 2,
      },
    ],
  },
  {
    bill_name: "令和8年度相模原市一般会計補正予算（子育て支援）",
    sources: [
      {
        kind: "bill_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2013120900011/",
        label: "議案書（9月定例会議）",
        sort_order: 0,
      },
      {
        kind: "result_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2013120900035/",
        label: "審議結果（9月定例会議）",
        meeting_date: "2026-10-02",
        sort_order: 1,
      },
    ],
  },
];

/** 会議予定（令和8年度の一部。公開済み） */
export const councilMeetings: CouncilMeetingInsert[] = [
  {
    meeting_date: "2026-11-26",
    name: "本会議（12月定例会議 初日）",
    category: "plenary",
    start_time: "午前9時30分",
    place: "議場",
    council_year: 2026,
    source_url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    session_label: "12月定例会議",
    stream_url: "https://www.sagamihara-shigikai.jp/doc/2017051800044/",
    is_published: true,
  },
  {
    meeting_date: "2026-12-04",
    name: "総務委員会",
    category: "standing",
    start_time: "午前9時30分",
    place: "第1委員会室",
    council_year: 2026,
    source_url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    session_label: "12月定例会議",
    is_published: true,
  },
  {
    meeting_date: "2026-12-07",
    name: "こども文教委員会",
    category: "standing",
    start_time: "午前9時30分",
    place: "第2委員会室",
    council_year: 2026,
    source_url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    session_label: "12月定例会議",
    is_published: true,
  },
  {
    meeting_date: "2026-12-18",
    name: "本会議（12月定例会議 最終日）",
    category: "plenary",
    start_time: "午前9時30分",
    place: "議場",
    council_year: 2026,
    source_url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    session_label: "12月定例会議",
    stream_url: "https://www.sagamihara-shigikai.jp/doc/2017051800044/",
    is_published: true,
  },
  {
    meeting_date: "2026-11-10",
    name: "議会運営委員会",
    category: "steering",
    start_time: "午前10時",
    place: "第1委員会室",
    council_year: 2026,
    source_url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    is_published: false,
  },
];
