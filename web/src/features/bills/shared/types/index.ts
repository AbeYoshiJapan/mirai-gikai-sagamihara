import {
  getBillDecisionLabel,
  getBillOutcomeLabel,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { Database } from "@mirai-gikai/supabase";

// Database types
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

/**
 * 公開側で扱う解説。生成元や確認者の記録（generation_job_id / source_hash /
 * reviewed_by / reviewed_at）は管理画面だけの情報なので持たない。
 */
export type BillContent = Pick<
  Database["public"]["Tables"]["bill_contents"]["Row"],
  | "id"
  | "bill_id"
  | "title"
  | "summary"
  | "content"
  | "difficulty_level"
  | "created_at"
  | "updated_at"
>;
export type BillContentInsert =
  Database["public"]["Tables"]["bill_contents"]["Insert"];
export type BillContentUpdate =
  Database["public"]["Tables"]["bill_contents"]["Update"];

export type MiraiStance = Database["public"]["Tables"]["mirai_stances"]["Row"];

// Enums
export type HouseEnum = Database["public"]["Enums"]["house_enum"];
export type BillStatusEnum = Database["public"]["Enums"]["bill_status_enum"];
export type BillArticleKind = Database["public"]["Enums"]["bill_article_kind"];
export type StanceTypeEnum = Database["public"]["Enums"]["stance_type_enum"];

// 公開ステータス型（議案の公開/非公開を管理）
export type BillPublishStatus = "draft" | "published" | "coming_soon";

// Coming Soon議案の型（最小限の情報のみ）
export type ComingSoonBill = {
  id: string;
  name: string; // 正式名称
  title: string | null; // わかりやすいタイトル（bill_contentsから）
  originating_house: HouseEnum;
  shugiin_url: string | null;
};

// Combined types for UI
export type BillWithStance = Bill & {
  mirai_stance?: MiraiStance;
};

export type BillTag = {
  id: string;
  label: string;
};

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

/** 付託先の委員会（公開ページで出す列だけ） */
export type BillCommittee = {
  id: string;
  name: string;
  short_name: string;
};

/** 一次資料（公開ページで出す列だけ。抽出本文は含めない） */
export type BillSourceItem = {
  id: string;
  kind: Database["public"]["Enums"]["bill_source_kind"];
  url: string;
  label: string;
  meeting_date: string | null;
  sort_order: number;
};

export type VoteValue = Database["public"]["Enums"]["vote_value"];

export type FactionVote = {
  faction: { id: string; name: string; short_name: string; sort_order: number };
  vote: VoteValue;
  note: string | null;
};

export type MemberVote = {
  member: {
    id: string;
    name: string;
    ward: string;
    faction_name: string | null;
    sort_order: number;
  };
  vote: VoteValue;
  note: string | null;
};

export type BillVotes = {
  factions: FactionVote[];
  members: MemberVote[];
};

export type BillWithContent = Bill & {
  bill_content?: BillContent;
  mirai_stance?: MiraiStance;
  tags: BillTag[];
  committee?: BillCommittee | null;
  sources?: BillSourceItem[];
  votes?: BillVotes;
  featured_tag?: FeaturedTag;
  hasPublicInterview?: boolean;
  /** 公開レポート件数。一覧の回答数バッジと「声が集まっている順」に使う。 */
  publicReportCount?: number;
};

// タグごとにグループ化された議案
export type BillsByTag = {
  tag: BillTag & { description?: string; priority: number };
  bills: BillWithContent[];
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatusEnum, number> = {
  enacted: 0,
  rejected: 1,
  in_receiving_house: 2,
  in_originating_house: 3,
  introduced: 4,
  preparing: 5,
  reported: 6,
  plan: 7,
  special_committee: 8,
};

/**
 * 審議状況の日本語ラベル（オープンデータ API などサイト設定の外で使う）。
 * 議決済みなら「可決（賛成多数）」のように採決結果も添える。
 */
export function getBillStatusLabel(bill: {
  bill_kind: Bill["bill_kind"];
  stage: Bill["stage"];
  result: Bill["result"];
  vote_outcome: Bill["vote_outcome"];
}): string {
  return getBillDecisionLabel(bill) ?? getBillOutcomeLabel(bill);
}

export const STANCE_LABELS: Record<StanceTypeEnum, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
  free_vote: "自由投票",
};
