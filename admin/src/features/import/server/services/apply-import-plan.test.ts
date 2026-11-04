import type { ImportPlan, PlanEntry } from "@mirai-gikai/shared/import/plan";
import { describe, expect, it, vi } from "vitest";
import {
  type ApplyImportDeps,
  applyImportPlan,
  changesToBillFields,
} from "./apply-import-plan";

const committees = [{ id: "c-soumu", name: "総務委員会", short_name: "総務" }];

function entry(overrides: Partial<PlanEntry>): PlanEntry {
  return {
    citation: "令和8年議案第1号",
    name: "テスト議案",
    action: "skip",
    reason: null,
    existingId: null,
    existingPublishStatus: null,
    draft: null,
    changes: [],
    sources: [],
    warnings: [],
    ...overrides,
  };
}

function deps(): ApplyImportDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    insertDraftBill: vi.fn(async (draft) => {
      calls.push(`insert:${draft.bill_number}`);
      return "new-bill";
    }),
    updateBillFields: vi.fn(async (id, fields) => {
      calls.push(`update:${id}:${Object.keys(fields).join(",")}`);
    }),
    insertBillSource: vi.fn(async (params) => {
      calls.push(`source:${params.billId}:${params.kind}`);
    }),
    updateBillSourceText: vi.fn(async (params) => {
      calls.push(`text:${params.id}`);
    }),
  };
}

describe("changesToBillFields", () => {
  it("表示用の変更を列に写し、付託先は委員会名から id にする", () => {
    const fields = changesToBillFields(
      entry({
        changes: [
          {
            field: "committee_id",
            label: "付託先",
            from: null,
            to: "総務委員会",
          },
          {
            field: "stage",
            label: "審議段階",
            from: "submitted",
            to: "referred",
          },
          { field: "result", label: "結果", from: null, to: "passed" },
          {
            field: "decided_on",
            label: "議決日",
            from: null,
            to: "2026-09-30",
          },
          { field: "name", label: "件名", from: "a", to: "b" },
        ],
      }),
      committees
    );
    expect(fields).toEqual({
      committee_id: "c-soumu",
      stage: "referred",
      result: "passed",
      decided_on: "2026-09-30",
    });
  });
});

describe("applyImportPlan", () => {
  const plan: ImportPlan = {
    mode: "agenda",
    entries: [
      entry({
        citation: "令和8年議案第1号",
        action: "create",
        draft: {
          name: "新しい議案",
          bill_number: "令和8年議案第1号",
          bill_kind: "ordinance",
          proposer_kind: "mayor",
          committee_id: "c-soumu",
          stage: "referred",
          submitted_date: "2026-09-01",
          diet_session_id: "s-1",
        },
        sources: [
          {
            kind: "bill_pdf",
            url: "https://example.com/a.pdf",
            label: "議案書",
            text: "本文",
            contentHash: "h1",
            action: "add",
            existingId: null,
          },
        ],
      }),
      entry({
        citation: "令和8年議案第2号",
        action: "update",
        existingId: "bill-2",
        changes: [
          {
            field: "stage",
            label: "審議段階",
            from: "submitted",
            to: "referred",
          },
        ],
        sources: [
          {
            kind: "bill_pdf",
            url: "https://example.com/b.pdf",
            label: "議案書",
            text: "新しい本文",
            contentHash: "h2",
            action: "update_text",
            existingId: "src-2",
          },
        ],
      }),
      entry({
        citation: "令和8年議案第3号",
        action: "skip",
        reason: "変更なし",
      }),
    ],
    summary: { create: 1, update: 1, skip: 1, warnings: 0 },
  };

  it("追加・更新を実行し、変更なしは数えるだけ", async () => {
    const d = deps();
    const summary = await applyImportPlan(plan, committees, d);
    expect(summary).toMatchObject({
      created: 1,
      updated: 1,
      skipped: 1,
      errors: [],
    });
    expect(d.calls).toEqual([
      "insert:令和8年議案第1号",
      "source:new-bill:bill_pdf",
      "update:bill-2:stage",
      "text:src-2",
    ]);
  });

  it("選んだ項目だけ適用する", async () => {
    const d = deps();
    const summary = await applyImportPlan(plan, committees, d, {
      citations: ["令和8年議案第2号"],
    });
    expect(summary).toMatchObject({ created: 0, updated: 1, skipped: 2 });
    expect(d.calls).toEqual(["update:bill-2:stage", "text:src-2"]);
  });

  it("1 件の失敗で止めず、エラーとして残す", async () => {
    const d = deps();
    d.insertDraftBill = vi.fn(async () => {
      throw new Error("DB down");
    });
    const summary = await applyImportPlan(plan, committees, d);
    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(1);
    expect(summary.errors).toEqual(["令和8年議案第1号: DB down"]);
  });
});
