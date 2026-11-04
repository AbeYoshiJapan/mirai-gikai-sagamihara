import "server-only";

import type {
  CommitteeRef,
  ImportPlan,
  PlanEntry,
} from "@mirai-gikai/shared/import/plan";
import type { Database } from "@mirai-gikai/supabase";
import type { ApplyImportSummary } from "../../shared/types";

type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];
type SourceKind = Database["public"]["Enums"]["bill_source_kind"];

/** DB 操作を差し替えられるようにして、計画の実行だけを単体テストできる形にしておく */
export type ApplyImportDeps = {
  insertDraftBill: (draft: NonNullable<PlanEntry["draft"]>) => Promise<string>;
  updateBillFields: (id: string, fields: BillUpdate) => Promise<void>;
  insertBillSource: (params: {
    billId: string;
    kind: SourceKind;
    url: string;
    label: string;
    extractedText: string | null;
    contentHash: string | null;
  }) => Promise<void>;
  updateBillSourceText: (params: {
    id: string;
    extractedText: string;
    contentHash: string | null;
  }) => Promise<void>;
};

/** 計画の変更（表示用の値）を bills の列に写す。付託先は委員会名 → id */
export function changesToBillFields(
  entry: PlanEntry,
  committees: CommitteeRef[]
): BillUpdate {
  const fields: BillUpdate = {};
  for (const change of entry.changes) {
    switch (change.field) {
      case "bill_number":
        fields.bill_number = change.to;
        break;
      case "committee_id": {
        const committee = committees.find((c) => c.name === change.to);
        if (committee) fields.committee_id = committee.id;
        break;
      }
      case "bill_kind":
        fields.bill_kind = change.to as BillUpdate["bill_kind"];
        break;
      case "submitted_date":
        fields.submitted_date = change.to;
        break;
      case "stage":
        fields.stage = change.to as BillUpdate["stage"];
        break;
      case "result":
        fields.result = change.to as BillUpdate["result"];
        break;
      case "vote_outcome":
        fields.vote_outcome = change.to as BillUpdate["vote_outcome"];
        break;
      case "decided_on":
        fields.decided_on = change.to;
        break;
      case "status_note":
        fields.status_note = change.to;
        break;
      default:
        break;
    }
  }
  return fields;
}

export async function applyImportPlan(
  plan: ImportPlan,
  committees: CommitteeRef[],
  deps: ApplyImportDeps,
  options: { citations?: string[] } = {}
): Promise<ApplyImportSummary> {
  const selected = options.citations ? new Set(options.citations) : null;
  const summary: ApplyImportSummary = {
    runId: null,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const entry of plan.entries) {
    if (
      entry.action === "skip" ||
      (selected && !selected.has(entry.citation))
    ) {
      summary.skipped += 1;
      continue;
    }
    try {
      let billId = entry.existingId;
      if (entry.action === "create") {
        if (!entry.draft) throw new Error("新規作成の内容がありません");
        billId = await deps.insertDraftBill(entry.draft);
        summary.created += 1;
      } else {
        if (!billId) throw new Error("更新先の議案がありません");
        const fields = changesToBillFields(entry, committees);
        if (Object.keys(fields).length > 0) {
          await deps.updateBillFields(billId, fields);
        }
        summary.updated += 1;
      }
      for (const source of entry.sources) {
        if (source.action === "add") {
          await deps.insertBillSource({
            billId,
            kind: source.kind as SourceKind,
            url: source.url,
            label: source.label,
            extractedText: source.text,
            contentHash: source.contentHash,
          });
        } else if (
          source.action === "update_text" &&
          source.existingId &&
          source.text
        ) {
          await deps.updateBillSourceText({
            id: source.existingId,
            extractedText: source.text,
            contentHash: source.contentHash,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push(`${entry.citation}: ${message}`);
    }
  }
  return summary;
}
