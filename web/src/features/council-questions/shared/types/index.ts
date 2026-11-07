import type {
  CouncilQuestionKind,
  NoticeItem,
} from "@mirai-gikai/shared/council-questions/types";

/** 公開サイトに出す、議会での質問（運営者が確認して公開したものだけ） */
export type PublicCouncilQuestion = {
  id: string;
  meeting_key: string;
  meeting_name: string;
  kind: CouncilQuestionKind;
  order_no: number;
  seat_number: number | null;
  member_name: string;
  faction_label: string;
  method: string | null;
  question_date: string | null;
  items: NoticeItem[];
  bill_refs: string[];
  source_url: string | null;
  stream_url: string | null;
  minutes_url: string | null;
  confirmed_at: string | null;
};

export type PublicQuestionMeeting = {
  meeting_key: string;
  meeting_name: string;
  count: number;
};

export type PublicTheme = {
  id: string;
  label: string;
  description: string | null;
};

export type PublicThemeSummary = PublicTheme & {
  billCount: number;
  questionCount: number;
};

/** テーマにひも付いた、質問の大きな項目 */
export type ThemeQuestionItem = {
  question: PublicCouncilQuestion;
  itemNumber: number;
};

export type ThemeBill = {
  id: string;
  name: string;
  title: string | null;
  bill_number: string | null;
  submitted_date: string | null;
};

export type LinkedBill = { id: string; bill_number: string; name: string };
