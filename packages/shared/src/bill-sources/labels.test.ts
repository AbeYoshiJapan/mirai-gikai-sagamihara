import { describe, expect, it } from "vitest";
import {
  BILL_SOURCE_KIND_LABELS,
  BILL_SOURCE_KINDS,
  compareBillSources,
} from "./labels";

describe("bill-sources labels", () => {
  it("全種類に表示名がある", () => {
    for (const kind of BILL_SOURCE_KINDS) {
      expect(BILL_SOURCE_KIND_LABELS[kind]).toBeTruthy();
    }
  });

  it("sort_order → 種類 → 会議日の順に並ぶ", () => {
    const sorted = [
      { kind: "video" as const, sort_order: 0, meeting_date: "2026-09-10" },
      { kind: "bill_pdf" as const, sort_order: 0, meeting_date: null },
      { kind: "minutes_committee" as const, sort_order: 0, meeting_date: "2026-09-05" },
      { kind: "minutes_committee" as const, sort_order: 0, meeting_date: "2026-09-01" },
      { kind: "other" as const, sort_order: -1, meeting_date: null },
    ].sort(compareBillSources);
    expect(sorted.map((s) => `${s.kind}:${s.meeting_date ?? ""}`)).toEqual([
      "other:",
      "bill_pdf:",
      "minutes_committee:2026-09-01",
      "minutes_committee:2026-09-05",
      "video:2026-09-10",
    ]);
  });
});
