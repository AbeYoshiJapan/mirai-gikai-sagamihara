/**
 * 議会での質問（代表質問・個人質疑・一般質問）。
 * 議会が公表する通告一覧をもとに仮登録し、運営者が確認して公開する。
 */
import type {
  CouncilQuestionKind,
  NoticeItem,
} from "@mirai-gikai/shared/council-questions/types";

export {
  COUNCIL_QUESTION_KIND_LABELS,
  COUNCIL_QUESTION_KIND_ORDER,
  type CouncilQuestionKind,
  type NoticeItem,
} from "@mirai-gikai/shared/council-questions/types";

/** PDF から取り出した 1 行（見えている文字だけ）。runs は間が空いた文字のかたまり */
export type PdfLine = {
  page: number;
  /** ページ下からの位置（大きいほど上） */
  y: number;
  runs: { x: number; text: string }[];
  text: string;
};

export type NoticeQuestion = {
  order: number;
  seatNumber: number | null;
  memberName: string;
  factionLabel: string;
  /** 一括／一問一答／一括・一問一答（一般質問だけ） */
  method: string | null;
  items: NoticeItem[];
};

/** 通告一覧 1 本を読んだ結果 */
export type ParsedNoticeList = {
  /** general = 一般質問通告一覧、representative = 代表質問・個人質疑通告一覧 */
  listKind: "general" | "representative";
  /** 一覧の日付（YYYY-MM-DD） */
  noticeDate: string | null;
  questions: NoticeQuestion[];
  warnings: string[];
};

/** 一般質問順位を読んだ結果 */
export type ParsedQuestionOrder = {
  year: number | null;
  month: number | null;
  rows: {
    order: number;
    seatNumber: number | null;
    memberName: string;
    factionLabel: string;
    method: string | null;
    /** 予定日（YYYY-MM-DD）。読めなければ null */
    date: string | null;
  }[];
  warnings: string[];
};

/** 議会サイトの「提出議案・発言通告」ページで見つけた通告一覧の PDF */
export type NoticeLinks = {
  /** 例: 令和8年9月定例会議 */
  meetingName: string | null;
  meetingKey: string | null;
  representativeUrl: string | null;
  generalUrl: string | null;
  orderUrl: string | null;
};

/** 管理画面で扱う、議会での質問 1 件 */
export type AdminCouncilQuestion = {
  id: string;
  meeting_key: string;
  meeting_name: string;
  list_kind: "representative" | "general";
  kind: CouncilQuestionKind;
  order_no: number;
  seat_number: number | null;
  member_name: string;
  faction_label: string;
  method: string | null;
  question_date: string | null;
  notice_date: string | null;
  items: NoticeItem[];
  bill_refs: string[];
  source_url: string | null;
  stream_url: string | null;
  minutes_url: string | null;
  is_published: boolean;
  confirmed_at: string | null;
  operator_edited_at: string | null;
  fetched_at: string | null;
  pending_update: QuestionPendingUpdate | null;
  updated_at: string;
};

/** 公式の通告一覧が変わった・無くなったときの保留 */
export type QuestionPendingUpdate =
  | { kind: "changed"; draft: QuestionDraftSnapshot; detectedAt: string }
  | { kind: "removed"; detectedAt: string };

/** 保留に入れる、通告一覧から読めた内容 */
export type QuestionDraftSnapshot = {
  seatNumber: number | null;
  memberName: string;
  factionLabel: string;
  method: string | null;
  questionDate: string | null;
  noticeDate: string | null;
  items: NoticeItem[];
  sourceUrl: string | null;
};

/** 定例会議ごとのまとめ（管理画面の一覧） */
export type QuestionMeetingSummary = {
  meeting_key: string;
  meeting_name: string;
  total: number;
  published: number;
  /** 公式の通告一覧が変わった・無くなった */
  pending: number;
};

export type ThemeOption = { id: string; label: string; is_theme: boolean };

/** 質問の大きな項目（番号）とテーマのひも付け */
export type QuestionThemeLink = { item_number: number; tag_id: string };

/** 通告一覧の取込結果 */
export type QuestionImportResult =
  | {
      ok: true;
      meetingKey: string;
      meetingName: string;
      inserted: number;
      updated: number;
      pending: number;
      removed: number;
      unchanged: number;
      sources: { label: string; url: string }[];
      warnings: string[];
    }
  | { ok: false; error: string; warnings: string[] };
