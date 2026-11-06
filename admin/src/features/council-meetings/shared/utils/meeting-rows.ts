import { councilYearOfDateKey } from "@mirai-gikai/shared/council-meetings/council-year";
import type {
  PendingSiteUpdate,
  SiteMeetingCandidate,
  SiteMeetingSnapshot,
} from "@mirai-gikai/shared/council-meetings/plan-site-import";
import type { CouncilMeetingInput } from "../types";

/** 日本時間の今日（YYYY-MM-DD） */
export function jstDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    date
  );
}

const emptyToNull = (value: string): string | null =>
  value.trim() === "" ? null : value.trim();

/** 管理画面のフォームの値を、council_meetings の列にする（公開状態は別に決める） */
export function toMeetingColumns(
  input: CouncilMeetingInput,
  context: { yearStartMonth: number; defaultSourceUrl: string }
) {
  return {
    meeting_date: input.meeting_date,
    end_date: emptyToNull(input.end_date),
    name: input.name.trim(),
    category: input.category,
    committee_id: emptyToNull(input.committee_id),
    start_time: emptyToNull(input.start_time),
    place: emptyToNull(input.place),
    topic: emptyToNull(input.topic),
    session_label: emptyToNull(input.session_label),
    source_url: input.source_url.trim() || context.defaultSourceUrl,
    stream_url: emptyToNull(input.stream_url),
    minutes_url: emptyToNull(input.minutes_url),
    agenda_pdf_url: emptyToNull(input.agenda_pdf_url),
    result_pdf_url: emptyToNull(input.result_pdf_url),
    council_year: councilYearOfDateKey(
      input.meeting_date,
      context.yearStartMonth
    ),
  };
}

/** 公式サイトから取った会議を、仮登録の行にする（非公開） */
export function toSiteInsertRow(
  candidate: SiteMeetingCandidate,
  context: { yearStartMonth: number; fetchedAt: string }
) {
  const { source_url, recognized: _recognized, ...snapshot } = candidate;
  return {
    ...toSnapshotColumns(snapshot, context.yearStartMonth),
    source: "site" as const,
    source_url,
    site_snapshot: snapshot,
    fetched_at: context.fetchedAt,
    is_published: false,
  };
}

/** 公式サイトの値を行の列にする（議会年度も合わせる） */
export function toSnapshotColumns(
  snapshot: SiteMeetingSnapshot,
  yearStartMonth: number
) {
  return {
    meeting_date: snapshot.meeting_date,
    end_date: snapshot.end_date,
    site_label: snapshot.site_label,
    name: snapshot.name,
    category: snapshot.category,
    committee_id: snapshot.committee_id,
    start_time: snapshot.start_time,
    place: snapshot.place,
    council_year: councilYearOfDateKey(snapshot.meeting_date, yearStartMonth),
  };
}

/** 「公式サイトに変更あり」を反映するときに書き換える列 */
export function pendingChangeColumns(
  pending: PendingSiteUpdate,
  yearStartMonth: number
): Record<string, unknown> | null {
  if (pending.kind !== "changed") return null;
  const columns: Record<string, unknown> = { ...pending.fields };
  if (typeof pending.fields.meeting_date === "string") {
    columns.council_year = councilYearOfDateKey(
      pending.fields.meeting_date,
      yearStartMonth
    );
  }
  return columns;
}
