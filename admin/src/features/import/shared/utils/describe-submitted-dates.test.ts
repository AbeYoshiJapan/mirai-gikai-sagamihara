import type { ImportPlan } from "@mirai-gikai/shared/import/plan";
import {
  IMPORT_FORMAT,
  type ImportBundle,
} from "@mirai-gikai/shared/import/schema";
import { describe, expect, it } from "vitest";
import { describeSubmittedDates } from "./describe-submitted-dates";

function bundle(submittedOn: (string | null)[]): ImportBundle {
  return {
    format: IMPORT_FORMAT,
    generated_at: "2026-11-11T00:00:00+00:00",
    source: { adapter: "sagamihara_agenda_pdf", url: null, files: [] },
    meeting: {
      council_year: 2026,
      era_year_label: "令和8年",
      session_name: "令和8年相模原市議会定例会",
      label: "12月定例会議",
      as_of: "2026-11-10",
    },
    items: submittedOn.map((date, i) => ({
      key: `2026:bill:${137 + i}`,
      kind: "bill",
      number: 137 + i,
      number_label: `議案第${137 + i}号`,
      number_year: 2026,
      citation: `令和8年議案第${137 + i}号`,
      name: "条例の一部を改正する条例について",
      bill_kind: "ordinance",
      proposer_kind: "mayor",
      committees: [],
      subcommittees: [],
      added_this_time: false,
      carried_over: false,
      submitted_on: date,
      proposers: [],
      category_hint: null,
      document: null,
      warnings: [],
    })),
    results: [],
    warnings: [],
  };
}

function plan(overrides: Partial<ImportPlan> = {}): ImportPlan {
  return {
    mode: "agenda",
    entries: [],
    summary: { create: 0, update: 0, skip: 0, warnings: 0 },
    meetingPeriod: null,
    ...overrides,
  };
}

describe("describeSubmittedDates", () => {
  it("定例会議の期間が分かれば、初日を提出日にすることを説明する", () => {
    const result = describeSubmittedDates(
      bundle([null, null]),
      plan({
        meetingPeriod: {
          name: "12月定例会議",
          start_date: "2026-11-17",
          end_date: "2026-12-18",
        },
      })
    );
    expect(result.warnings).toEqual([]);
    expect(result.notes[0]).toContain("12月定例会議の初日（2026-11-17）");
  });

  it("期間が無く議案書も無い議案があれば、一覧の日付になると注意する", () => {
    const result = describeSubmittedDates(bundle([null, "2026-11-17"]), plan());
    expect(result.notes).toEqual([]);
    expect(result.warnings[0]).toContain("議案書の無い 1 件");
    expect(result.warnings[0]).toContain("2026-11-10");
  });

  it("すべて議案書があれば、期間が無くても何も出さない", () => {
    expect(describeSubmittedDates(bundle(["2026-11-17"]), plan())).toEqual({
      notes: [],
      warnings: [],
    });
  });

  it("審議結果の取込では何も出さない", () => {
    expect(
      describeSubmittedDates(bundle([null]), plan({ mode: "results" }))
    ).toEqual({ notes: [], warnings: [] });
  });
});
