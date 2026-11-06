import { needsReview } from "./meeting-review-state";

/** 一覧の切り替え。確認待ち（仮登録・変更あり・消えた）／これから／過去 */
export type MeetingListView = "review" | "upcoming" | "past";

export const MEETING_LIST_VIEW_LABELS: Record<MeetingListView, string> = {
  review: "確認待ち",
  upcoming: "これからの会議",
  past: "過去の会議",
};

export function parseMeetingListView(value: unknown): MeetingListView {
  return value === "upcoming" || value === "past" ? value : "review";
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** 一覧ごとに読む日付の範囲 */
export function meetingListRange(
  view: MeetingListView,
  today: string
): { from: string; to: string } {
  switch (view) {
    case "upcoming":
      return { from: today, to: addDays(today, 365) };
    case "past":
      return { from: addDays(today, -365), to: addDays(today, -1) };
    default:
      // 確認待ちは、少し前の分（取り込んだまま確認していない会議）も出す
      return { from: addDays(today, -60), to: addDays(today, 365) };
  }
}

/** 一覧に出す会議。確認待ちは要確認のものだけ、過去は新しい順 */
export function selectMeetingsForView<
  T extends { is_published: boolean; pending_update: unknown },
>(meetings: T[], view: MeetingListView): T[] {
  if (view === "review") return meetings.filter(needsReview);
  if (view === "past") return [...meetings].reverse();
  return meetings;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 例：2026-11-17 → 2026/11/17（火） */
export function formatDateWithWeekday(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}/${m}/${d}（${weekday}）`;
}
