import "server-only";

import type { MeetingPeriod } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import {
  type CommitteeRef,
  detectImportMode,
  type ExistingBill,
  type ImportPlan,
  planAgendaImport,
  planResultsImport,
} from "@mirai-gikai/shared/import/plan";
import {
  type ImportBundle,
  parseImportBundle,
} from "@mirai-gikai/shared/import/schema";
import type { ImportPreview } from "../../shared/types";
import { describeSubmittedDates } from "../../shared/utils/describe-submitted-dates";

export type BuildPreviewResult =
  | { ok: true; bundle: ImportBundle; plan: ImportPlan; preview: ImportPreview }
  | { ok: false; error: string };

/** JSON を検証し、既存の議案と突き合わせて計画を作る（プレビューと適用で同じものを使う） */
export function buildImportPreview(
  bundleJson: string,
  sessionId: string,
  existing: ExistingBill[],
  committees: CommitteeRef[],
  meetingPeriods: MeetingPeriod[]
): BuildPreviewResult {
  const parsed = parseImportBundle(bundleJson);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const bundle = parsed.bundle;
  const mode = detectImportMode(bundle);
  const plan =
    mode === "results"
      ? planResultsImport(bundle, existing, committees, sessionId)
      : planAgendaImport(
          bundle,
          existing,
          committees,
          sessionId,
          meetingPeriods
        );
  const submittedDates = describeSubmittedDates(bundle, plan);
  return {
    ok: true,
    bundle,
    plan,
    preview: {
      plan,
      meeting: {
        session_name: bundle.meeting.session_name,
        label: bundle.meeting.label,
        as_of: bundle.meeting.as_of,
        adapter: bundle.source.adapter,
      },
      bundleWarnings: [...bundle.warnings, ...submittedDates.warnings],
      notes: submittedDates.notes,
    },
  };
}
