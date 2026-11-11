import type { ImportPlan } from "@mirai-gikai/shared/import/plan";
import type { ImportBundle } from "@mirai-gikai/shared/import/schema";

/**
 * 付議事件一覧の取込で、提出日をどう入れるかの説明（notes）と注意（warnings）。
 * 議案は定例会議の初日に提出されるので、議案書の無い議案は初日を仮の提出日にする。
 * 会期に定例会議の期間が無いと初日が分からないので、一覧の日付になることを知らせる。
 */
export function describeSubmittedDates(
  bundle: ImportBundle,
  plan: ImportPlan
): { notes: string[]; warnings: string[] } {
  if (plan.mode !== "agenda") return { notes: [], warnings: [] };
  const withoutDocument = bundle.items.filter((i) => !i.submitted_on).length;
  const period = plan.meetingPeriod ?? null;
  if (period) {
    return {
      notes: [
        `提出日：議案書があれば議案書の日付、まだ無ければ${period.name}の初日（${period.start_date}）にします。`,
      ],
      warnings: [],
    };
  }
  if (withoutDocument === 0) return { notes: [], warnings: [] };
  const label = bundle.meeting.label ?? "この定例会議";
  return {
    notes: [],
    warnings: [
      `選んだ会期に${label}の期間が入っていないため、議案書の無い ${withoutDocument} 件の提出日は一覧の日付（${bundle.meeting.as_of ?? "なし"}）にします。「会期管理」でこの会期に定例会議の期間を入れると、初日を提出日にします。`,
    ],
  };
}
