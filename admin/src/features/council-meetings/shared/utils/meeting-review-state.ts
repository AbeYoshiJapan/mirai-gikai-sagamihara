import type { PendingSiteUpdate } from "@mirai-gikai/shared/council-meetings/plan-site-import";

/**
 * 管理画面の一覧で出す、会議予定の状態。
 * - provisional：仮登録（自動取得・手入力のまま、まだ公開していない）
 * - changed：公開中だが、公式サイトの内容が変わった（反映するか決める）
 * - removed：公式サイトから消えた（中止・延期の可能性。消すか決める）
 * - published：公開中（確認済み）
 */
export type MeetingReviewState =
  | "provisional"
  | "changed"
  | "removed"
  | "published";

export const MEETING_REVIEW_STATE_LABELS: Record<MeetingReviewState, string> = {
  provisional: "仮登録",
  changed: "公式サイトに変更あり",
  removed: "公式サイトから消えた",
  published: "公開中",
};

/** DB の pending_update を読む。形が違えば null */
export function readPendingUpdate(value: unknown): PendingSiteUpdate | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as { kind?: unknown; fields?: unknown };
  if (v.kind === "removed") return value as PendingSiteUpdate;
  if (
    v.kind === "changed" &&
    typeof v.fields === "object" &&
    v.fields !== null
  ) {
    return value as PendingSiteUpdate;
  }
  return null;
}

export function getMeetingReviewState(meeting: {
  is_published: boolean;
  pending_update: unknown;
}): MeetingReviewState {
  const pending = readPendingUpdate(meeting.pending_update);
  if (pending?.kind === "removed") return "removed";
  if (pending?.kind === "changed") return "changed";
  return meeting.is_published ? "published" : "provisional";
}

/** 確認待ち（仮登録・変更あり・消えた）か */
export function needsReview(meeting: {
  is_published: boolean;
  pending_update: unknown;
}): boolean {
  return getMeetingReviewState(meeting) !== "published";
}

const FIELD_LABELS: Record<string, string> = {
  meeting_date: "開催日",
  end_date: "終了日",
  name: "会議名",
  category: "区分",
  committee_id: "委員会",
  start_time: "開始",
  place: "場所",
};

/** 「開始：午前10時 → 午後1時」のような、変更の説明 */
export function describePendingChanges(
  pending: PendingSiteUpdate | null
): string[] {
  if (!pending || pending.kind !== "changed") return [];
  return Object.entries(pending.fields).map(([field, to]) => {
    const from = (pending.previous as Record<string, unknown>)[field];
    const show = (v: unknown) =>
      v === null || v === undefined || v === "" ? "（なし）" : String(v);
    return `${FIELD_LABELS[field] ?? field}：${show(from)} → ${show(to)}`;
  });
}
