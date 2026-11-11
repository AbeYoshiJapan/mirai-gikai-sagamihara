import { describe, expect, it } from "vitest";
import {
  buildSourceText,
  type CommitteeRef,
  detectImportMode,
  type ExistingBill,
  findCommittee,
  planAgendaImport,
  planResultsImport,
} from "./plan";
import type { MeetingPeriod } from "../diet-sessions/meeting-periods";
import { IMPORT_FORMAT, type ImportBundle, type ImportItem, parseImportBundle } from "./schema";

const committees: CommitteeRef[] = [
  { id: "c-soumu", name: "総務委員会", short_name: "総務" },
  { id: "c-kensetsu", name: "建設委員会", short_name: "建設" },
  { id: "c-kessan", name: "決算特別委員会", short_name: "決算特別" },
];

function item(overrides: Partial<ImportItem> = {}): ImportItem {
  return {
    key: "2026:bill:99",
    kind: "bill",
    number: 99,
    number_label: "議案第99号",
    number_year: 2026,
    citation: "令和8年議案第99号",
    name: "令和7年度相模原市一般会計歳入歳出決算",
    bill_kind: "settlement",
    proposer_kind: "mayor",
    committees: ["決算特別委員会"],
    subcommittees: [],
    added_this_time: false,
    carried_over: false,
    submitted_on: "2026-08-24",
    proposers: [],
    category_hint: null,
    document: {
      url: "https://example.com/2026_gian_99.pdf",
      file: "2026_gian_99.pdf",
      pages: [1, 151],
      title: null,
      text: "本文です",
      text_quality: "book",
      proposal_reason: "理由です",
      materials_text: null,
      sha256: "abc",
      truncated: false,
    },
    warnings: [],
    ...overrides,
  };
}

function bundle(overrides: Partial<ImportBundle> = {}): ImportBundle {
  return {
    format: IMPORT_FORMAT,
    generated_at: "2026-11-04T00:00:00+00:00",
    source: {
      adapter: "sagamihara_agenda_pdf",
      url: null,
      files: [
        {
          name: "2026_hugi_0930.pdf",
          url: "https://example.com/2026_hugi_0930.pdf",
          sha256: null,
          pages: 4,
          label: "付議事件一覧",
        },
      ],
    },
    meeting: {
      council_year: 2026,
      era_year_label: "令和8年",
      session_name: "令和8年相模原市議会定例会",
      label: "9月定例会議",
      as_of: "2026-09-30",
    },
    items: [item()],
    results: [],
    warnings: [],
    ...overrides,
  };
}

function existing(overrides: Partial<ExistingBill> = {}): ExistingBill {
  return {
    id: "bill-1",
    name: "令和7年度相模原市一般会計歳入歳出決算",
    bill_number: "令和8年議案第99号",
    bill_kind: "settlement",
    proposer_kind: "mayor",
    committee_id: "c-kessan",
    stage: "referred",
    result: null,
    vote_outcome: null,
    decided_on: null,
    submitted_date: "2026-08-24",
    status_note: null,
    publish_status: "draft",
    diet_session_id: "s-r8",
    sources: [
      {
        id: "src-1",
        kind: "bill_pdf",
        url: "https://example.com/2026_gian_99.pdf",
        content_hash: "abc",
        has_text: true,
      },
      {
        id: "src-2",
        kind: "agenda_pdf",
        url: "https://example.com/2026_hugi_0930.pdf",
        content_hash: null,
        has_text: false,
      },
    ],
    ...overrides,
  };
}

describe("findCommittee", () => {
  it("正式名・略称・「委員会」抜きで探せる", () => {
    expect(findCommittee(committees, "総務委員会")?.id).toBe("c-soumu");
    expect(findCommittee(committees, "総 務")?.id).toBe("c-soumu");
    expect(findCommittee(committees, "決算特別委員会")?.id).toBe("c-kessan");
    expect(findCommittee(committees, "民生委員会")).toBeNull();
  });
});

describe("planAgendaImport", () => {
  it("未登録の議案は下書きとして作る（公開しない）", () => {
    const plan = planAgendaImport(bundle(), [], committees, "s-r8");
    expect(plan.summary).toEqual({ create: 1, update: 0, skip: 0, warnings: 0 });
    const [entry] = plan.entries;
    expect(entry.action).toBe("create");
    expect(entry.draft).toEqual({
      name: "令和7年度相模原市一般会計歳入歳出決算",
      bill_number: "令和8年議案第99号",
      bill_kind: "settlement",
      proposer_kind: "mayor",
      committee_id: "c-kessan",
      stage: "referred",
      submitted_date: "2026-08-24",
      diet_session_id: "s-r8",
    });
    expect(entry.sources.map((s) => [s.kind, s.action])).toEqual([
      ["bill_pdf", "add"],
      ["agenda_pdf", "add"],
    ]);
    expect(entry.sources[0].text).toContain("【提案の理由】");
  });

  it("委員会が無ければ段階は提出済みで、警告を出す", () => {
    const plan = planAgendaImport(
      bundle({ items: [item({ committees: ["民生委員会"] })] }),
      [],
      committees,
      "s-r8"
    );
    expect(plan.entries[0].draft?.stage).toBe("submitted");
    expect(plan.entries[0].warnings[0]).toContain("民生委員会");
  });

  it("登録済みで変更が無ければ skip", () => {
    const plan = planAgendaImport(bundle(), [existing()], committees, "s-r8");
    expect(plan.entries[0].action).toBe("skip");
    expect(plan.entries[0].reason).toBe("変更なし");
  });

  it("番号で一致すれば件名が違っても同一とみなし、件名は上書きしない", () => {
    const current = existing({ name: "管理者が直した件名" });
    const plan = planAgendaImport(bundle(), [current], committees, "s-r8");
    const [entry] = plan.entries;
    expect(entry.existingId).toBe("bill-1");
    expect(entry.changes.find((c) => c.field === "name")).toBeUndefined();
    expect(entry.warnings[0]).toContain("件名が違います");
  });

  it("番号も件名も一致しなければ新規", () => {
    const current = existing({ name: "別の議案", bill_number: null });
    const plan = planAgendaImport(bundle(), [current], committees, "s-r8");
    expect(plan.entries[0].action).toBe("create");
  });

  it("番号が無い同名の議案は同じ会期なら同一とみなす", () => {
    const current = existing({ bill_number: null, committee_id: null, stage: "preparing", submitted_date: null, sources: [] });
    const plan = planAgendaImport(bundle(), [current], committees, "s-r8");
    const [entry] = plan.entries;
    expect(entry.action).toBe("update");
    expect(entry.existingId).toBe("bill-1");
    expect(entry.changes.map((c) => [c.field, c.to])).toEqual([
      ["bill_number", "令和8年議案第99号"],
      ["committee_id", "決算特別委員会"],
      ["submitted_date", "2026-08-24"],
      ["stage", "referred"],
    ]);
  });

  it("議決済みの議案の段階は戻さない", () => {
    const current = existing({ stage: "decided", result: "approved" });
    const plan = planAgendaImport(bundle(), [current], committees, "s-r8");
    expect(plan.entries[0].changes.find((c) => c.field === "stage")).toBeUndefined();
  });

  it("本文のハッシュが変わっていれば一次資料の本文を入れ替える", () => {
    const current = existing({
      sources: [
        { id: "src-1", kind: "bill_pdf", url: "https://example.com/2026_gian_99.pdf", content_hash: "old", has_text: true },
        { id: "src-2", kind: "agenda_pdf", url: "https://example.com/2026_hugi_0930.pdf", content_hash: null, has_text: false },
      ],
    });
    const plan = planAgendaImport(bundle(), [current], committees, "s-r8");
    const [entry] = plan.entries;
    expect(entry.action).toBe("update");
    expect(entry.sources[0]).toMatchObject({ action: "update_text", existingId: "src-1" });
  });
});

describe("planAgendaImport の提出日", () => {
  // 12月定例会議の付議事件一覧（11月10日現在・議案書なし）
  const december: MeetingPeriod[] = [
    { name: "9月定例会議", start_date: "2026-08-24", end_date: "2026-09-30" },
    { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
  ];
  const agendaOnly = (overrides: Partial<ImportItem> = {}) =>
    bundle({
      meeting: {
        council_year: 2026,
        era_year_label: "令和8年",
        session_name: "令和8年相模原市議会定例会",
        label: "12月定例会議",
        as_of: "2026-11-10",
      },
      items: [item({ submitted_on: null, document: null, ...overrides })],
    });
  const submittedChange = (plan: ReturnType<typeof planAgendaImport>) =>
    plan.entries[0].changes.find((c) => c.field === "submitted_date");

  it("議案書が無い新しい議案は、一覧の日付ではなく定例会議の初日を提出日にする", () => {
    const plan = planAgendaImport(agendaOnly(), [], committees, "s-r8", december);
    expect(plan.entries[0].draft?.submitted_date).toBe("2026-11-17");
    expect(plan.meetingPeriod?.name).toBe("12月定例会議");
  });

  it("定例会議の期間が無ければ、これまでどおり一覧の日付を使う", () => {
    const plan = planAgendaImport(agendaOnly(), [], committees, "s-r8");
    expect(plan.entries[0].draft?.submitted_date).toBe("2026-11-10");
    expect(plan.meetingPeriod).toBeNull();
  });

  it("前の取込で一覧の日付が入った議案は、定例会議の初日にする案を出す", () => {
    const current = existing({ submitted_date: "2026-11-10T00:00:00+00:00", sources: [] });
    const plan = planAgendaImport(agendaOnly(), [current], committees, "s-r8", december);
    expect(submittedChange(plan)).toEqual({
      field: "submitted_date",
      label: "提出日（定例会議の初日）",
      from: "2026-11-10",
      to: "2026-11-17",
    });
  });

  it("運営者が入れた日付は、議案書が無いかぎり変えない", () => {
    const current = existing({ submitted_date: "2026-11-20T00:00:00+00:00", sources: [] });
    const plan = planAgendaImport(agendaOnly(), [current], committees, "s-r8", december);
    expect(submittedChange(plan)).toBeUndefined();
  });

  it("議案書の提出日と違えば、議案書の日付にする案を出す", () => {
    const current = existing({ submitted_date: "2026-11-10T00:00:00+00:00" });
    const withDocument = bundle({ items: [item({ submitted_on: "2026-11-17" })] });
    const plan = planAgendaImport(withDocument, [current], committees, "s-r8", december);
    expect(plan.entries[0].action).toBe("update");
    expect(submittedChange(plan)).toEqual({
      field: "submitted_date",
      label: "提出日（議案書の日付）",
      from: "2026-11-10",
      to: "2026-11-17",
    });
  });

  it("議案書の提出日と同じなら変えない（日本時間の日付で比べる）", () => {
    // 2026-11-16T15:00Z = 日本時間 11/17 0 時
    const current = existing({ submitted_date: "2026-11-16T15:00:00+00:00" });
    const withDocument = bundle({ items: [item({ submitted_on: "2026-11-17" })] });
    const plan = planAgendaImport(withDocument, [current], committees, "s-r8", december);
    expect(submittedChange(plan)).toBeUndefined();
  });
});

describe("planResultsImport", () => {
  const resultsBundle = bundle({
    source: {
      adapter: "sagamihara_results_pdf",
      url: null,
      files: [{ name: "2026_kekka_9_0930.pdf", url: "https://example.com/kekka.pdf", sha256: null, pages: 3, label: "審議結果" }],
    },
    items: [],
    results: [
      {
        key: "2026:bill:99",
        kind: "bill",
        number: 99,
        number_label: "議案第99号",
        number_year: 2026,
        citation: "令和8年議案第99号",
        name: "令和7年度相模原市一般会計歳入歳出決算",
        committees: ["決算特別委員会"],
        decided_on: "2026-09-30",
        result: "approved",
        vote_outcome: "majority",
        raw_result: "認定(賛成多数)",
        warnings: [],
      },
      {
        key: "2025:petition:11",
        kind: "petition",
        number: 11,
        number_label: "陳情第11号",
        number_year: 2025,
        citation: "令和7年陳情第11号",
        name: "継続の陳情",
        committees: [],
        decided_on: "2026-09-30",
        result: "continued",
        vote_outcome: null,
        raw_result: "継続審査",
        warnings: [],
      },
      {
        key: "2026:petition:5",
        kind: "petition",
        number: 5,
        number_label: "陳情第5号",
        number_year: 2026,
        citation: "令和8年陳情第5号",
        name: "賛成なしの陳情",
        committees: [],
        decided_on: "2026-07-01",
        result: "not_adopted",
        vote_outcome: "minority",
        raw_result: "不採択(賛成なし)",
        warnings: [],
      },
      {
        key: "2026:bill:200",
        kind: "bill",
        number: 200,
        number_label: "議案第200号",
        number_year: 2026,
        citation: "令和8年議案第200号",
        name: "未登録の議案",
        committees: [],
        decided_on: null,
        result: "passed",
        vote_outcome: null,
        raw_result: "可決",
        warnings: [],
      },
    ],
  });

  it("議決結果を段階・結果・採決・議決日に写し、審議結果 PDF を一次資料に足す", () => {
    const petition = existing({
      id: "bill-2",
      name: "継続の陳情",
      bill_number: "令和7年陳情第11号",
      bill_kind: "citizen_petition",
      stage: "referred",
      sources: [],
    });
    const noVotes = existing({
      id: "bill-3",
      name: "賛成なしの陳情",
      bill_number: "令和8年陳情第5号",
      bill_kind: "citizen_petition",
      stage: "referred",
      sources: [],
    });
    const plan = planResultsImport(resultsBundle, [existing(), petition, noVotes], committees, "s-r8");
    expect(detectImportMode(resultsBundle)).toBe("results");
    expect(plan.summary).toEqual({ create: 0, update: 3, skip: 1, warnings: 0 });
    const [bill, continued, none, missing] = plan.entries;
    expect(none.changes.find((c) => c.field === "status_note")?.to).toBe(
      "本会議の議決結果：不採択(賛成なし)"
    );
    expect(bill.changes.map((c) => [c.field, c.to])).toEqual([
      ["stage", "decided"],
      ["result", "approved"],
      ["vote_outcome", "majority"],
      ["decided_on", "2026-09-30"],
    ]);
    expect(bill.sources[0]).toMatchObject({ kind: "result_pdf", action: "add" });
    expect(continued.changes.map((c) => [c.field, c.to])).toEqual([
      ["stage", "in_committee"],
      ["result", "continued"],
    ]);
    expect(missing.action).toBe("skip");
    expect(missing.reason).toContain("登録されていません");
  });
});

describe("parseImportBundle / buildSourceText", () => {
  it("形式が違う JSON を弾く", () => {
    expect(parseImportBundle("{").ok).toBe(false);
    const wrong = parseImportBundle(JSON.stringify({ ...bundle(), format: "other/1" }));
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toContain("format");
  });

  it("正しい JSON を受け付け、省略した項目は既定値になる", () => {
    const data = bundle();
    const parsed = parseImportBundle(JSON.stringify(data));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.bundle.items[0].citation).toBe("令和8年議案第99号");
    }
  });

  it("buildSourceText は提案の理由・関係資料・本文の順", () => {
    const text = buildSourceText(item({ document: { ...item().document!, materials_text: "概要" } }));
    expect(text.indexOf("【提案の理由】")).toBeLessThan(text.indexOf("【関係資料】"));
    expect(text.indexOf("【関係資料】")).toBeLessThan(text.indexOf("【本文】"));
  });
});
