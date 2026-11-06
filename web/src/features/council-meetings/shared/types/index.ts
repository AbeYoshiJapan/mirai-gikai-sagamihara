export type CouncilMeetingCategory =
  | "plenary"
  | "standing"
  | "special"
  | "steering"
  | "other";

/** 議会の会議予定。議会サイトの「会議日程」から取り込んだもの（is_published = true だけ公開側に出る）。 */
export type CouncilMeeting = {
  id: string;
  meeting_date: string;
  /** 複数日にわたる会議（管外行政調査など）の最終日。1日だけなら null。 */
  end_date: string | null;
  name: string;
  category: CouncilMeetingCategory;
  start_time: string | null;
  place: string | null;
  /** 傍聴席の階（例：17階）。 */
  gallery: string | null;
  topic: string | null;
  document_url: string | null;
  council_year: number;
  source_url: string;
  /** 中継・録画 */
  stream_url?: string | null;
  /** 会議録 */
  minutes_url?: string | null;
  /** 議事日程・付議事件 */
  agenda_pdf_url?: string | null;
  /** 審議結果 */
  result_pdf_url?: string | null;
  /** 会議期間の表示名（例: 9月定例会議） */
  session_label?: string | null;
  /** 議会サイトのカレンダーの表記（略称。例: 議運）。カレンダーのマスに出す */
  site_label?: string | null;
};

/** 議会期間（6月議会など）。本会議の初日から最終日まで。 */
export type CouncilPeriod = {
  /** 例：11月議会 */
  name: string;
  start_date: string;
  end_date: string;
};
