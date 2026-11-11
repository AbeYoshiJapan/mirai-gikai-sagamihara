import {
  type MeetingPeriod,
  sortMeetingPeriods,
} from "../diet-sessions/meeting-periods";

/**
 * 取込で入れる議案の提出日。
 *
 * 議案は定例会議の初日に提出（提案）される。付議事件一覧は開会前に「11月10日現在」の形で
 * 載るが、その日付は一覧を作った日で、提出日ではない（開会前は示されているだけ）。
 * そこで、議案書がまだ無い議案は、その定例会議の初日を仮の提出日にする。
 * 議案書が載ったら、議案書に書かれた提出日（「令和８年11月17日提出」）を使う。
 */

/** 名前を突き合わせるときの正規化（全角数字・空白の違いをならす） */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").normalize("NFKC");
}

/** `YYYY-MM-DD` どうしの日数（b − a） */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** 一覧の日付の後、この日数のうちに始まる定例会議なら、その定例会議の一覧とみなす */
const AGENDA_LEAD_DAYS = 31;

/**
 * 付議事件一覧の会議（例「12月定例会議」）に当たる期間を、会期に入れた「定例会議などの期間」から探す。
 * 1. 名前が一致する期間（同じ名前が複数あれば、一覧の日付に近いもの）
 * 2. 一覧の日付を含む期間
 * 3. 一覧の日付から 31 日以内に始まる期間
 * どれも無ければ null。
 */
export function findAgendaMeetingPeriod(
  meeting: { label: string | null; as_of: string | null },
  periods: MeetingPeriod[]
): MeetingPeriod | null {
  const sorted = sortMeetingPeriods(periods);
  const asOf = meeting.as_of;

  if (meeting.label) {
    const key = normalizeName(meeting.label);
    const named = sorted.filter((p) => normalizeName(p.name) === key);
    if (named.length === 1) return named[0];
    if (named.length > 1) {
      if (!asOf) return named[0];
      return [...named].sort(
        (a, b) =>
          Math.abs(daysBetween(asOf, a.start_date)) -
          Math.abs(daysBetween(asOf, b.start_date))
      )[0];
    }
  }

  if (!asOf) return null;
  const containing = sorted.find(
    (p) => p.start_date <= asOf && asOf <= p.end_date
  );
  if (containing) return containing;
  return (
    sorted.find(
      (p) =>
        p.start_date > asOf && daysBetween(asOf, p.start_date) <= AGENDA_LEAD_DAYS
    ) ?? null
  );
}

/**
 * 議案書がまだ無い議案の仮の提出日。
 * - 定例会議が分かれば、その初日
 * - 会議中に追加された議案（一覧の ※、途中提案）で、一覧の日付が初日より後なら、一覧の日付
 * - 定例会議が分からなければ、一覧の日付
 */
export function provisionalSubmittedDate(
  meeting: { as_of: string | null },
  period: MeetingPeriod | null,
  addedThisTime: boolean
): string | null {
  const asOf = meeting.as_of;
  if (!period) return asOf;
  if (addedThisTime && asOf && asOf > period.start_date) return asOf;
  return period.start_date;
}
