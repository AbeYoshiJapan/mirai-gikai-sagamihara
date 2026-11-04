import { z } from "zod";

/**
 * 会期（diet_sessions）の中の会議期間。
 *
 * 通年議会では 1 年の会期の中に「6月定例会議」「12月定例会議」のような会議期間が
 * いくつもある。diet_sessions.meeting_periods（jsonb の配列）に運営者が入力したものを
 * ここで検証して読む。空なら公開サイトは会議予定（council_meetings）の本会議名から
 * 期間を導出する。
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateString = z
  .string()
  .regex(DATE_PATTERN, "日付は YYYY-MM-DD の形式で入力してください");

export const meetingPeriodSchema = z
  .object({
    /** 例: 12月定例会議 */
    name: z.string().trim().min(1, "期間の名前を入力してください").max(40),
    start_date: dateString,
    end_date: dateString,
  })
  .refine((p) => p.start_date <= p.end_date, {
    message: "終了日は開始日以降の日付を指定してください",
    path: ["end_date"],
  });

export const MAX_MEETING_PERIODS = 30;

export const meetingPeriodsSchema = z
  .array(meetingPeriodSchema)
  .max(MAX_MEETING_PERIODS);

export type MeetingPeriod = z.infer<typeof meetingPeriodSchema>;

/** DB の JSON を読む。壊れていれば空配列（会議予定から導出する側に落とす）。開始日順に並べる。 */
export function parseMeetingPeriods(json: unknown): MeetingPeriod[] {
  const parsed = meetingPeriodsSchema.safeParse(json);
  if (!parsed.success) return [];
  return sortMeetingPeriods(parsed.data);
}

export function sortMeetingPeriods(periods: MeetingPeriod[]): MeetingPeriod[] {
  return [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/**
 * 管理画面の入力を検証する。問題があれば日本語のメッセージ、なければ null。
 * 会期（start/end）の外にはみ出す期間と、重なる期間は入力ミスとして弾く。
 */
export function validateMeetingPeriods(
  input: unknown,
  session?: { start_date: string; end_date: string }
): string | null {
  const parsed = meetingPeriodsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const index = typeof issue?.path[0] === "number" ? issue.path[0] + 1 : null;
    const where = index ? `${index}件目の期間: ` : "";
    return `${where}${issue?.message ?? "会議期間の入力に誤りがあります"}`;
  }

  const periods = sortMeetingPeriods(parsed.data);
  for (const [i, p] of periods.entries()) {
    if (
      session &&
      (p.start_date < session.start_date || p.end_date > session.end_date)
    ) {
      return `「${p.name}」は会期の期間（${session.start_date}〜${session.end_date}）の中に収めてください`;
    }
    const prev = periods[i - 1];
    if (prev && p.start_date <= prev.end_date) {
      return `「${prev.name}」と「${p.name}」の期間が重なっています`;
    }
  }
  return null;
}
