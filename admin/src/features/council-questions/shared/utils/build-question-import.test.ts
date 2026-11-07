import { describe, expect, it } from "vitest";
import type {
  NoticeQuestion,
  ParsedNoticeList,
  ParsedQuestionOrder,
} from "../types";
import {
  buildQuestionDrafts,
  type ExistingQuestion,
  planQuestionImport,
  snapshotOf,
  stableStringify,
} from "./build-question-import";

const question = (
  order: number,
  name: string,
  faction: string,
  method: string | null = null
): NoticeQuestion => ({
  order,
  seatNumber: order + 10,
  memberName: name,
  factionLabel: faction,
  method,
  items: [
    {
      label: "1",
      level: 1,
      text: `議案第９９号について（${name}）`,
      children: [],
    },
  ],
});

const notice = (
  listKind: ParsedNoticeList["listKind"],
  questions: NoticeQuestion[]
): ParsedNoticeList => ({
  listKind,
  noticeDate: listKind === "general" ? "2026-09-24" : "2026-09-01",
  questions,
  warnings: [],
});

const order: ParsedQuestionOrder = {
  year: 2026,
  month: 9,
  rows: [
    {
      order: 1,
      seatNumber: 11,
      memberName: "務川慧",
      factionLabel: "自民党",
      method: "一問一答",
      date: "2026-09-24",
    },
    {
      order: 2,
      seatNumber: 12,
      memberName: "別の人",
      factionLabel: "立民",
      method: "一括",
      date: "2026-09-25",
    },
  ],
  warnings: [],
};

const base = { meetingKey: "2026-09", meetingName: "令和8年9月定例会議" };

describe("buildQuestionDrafts", () => {
  it("一般質問には順位表の予定日を入れ、会派に属さない議員の質疑は個人質疑に分ける", () => {
    const { drafts, warnings } = buildQuestionDrafts({
      ...base,
      representative: {
        notice: notice("representative", [
          question(1, "寺田弘子", "自民党"),
          question(2, "羽生田学", "無所属"),
        ]),
        url: "https://example.jp/tsukoku.pdf",
      },
      general: {
        notice: notice("general", [
          question(1, "務川慧", "自民党", "一問一答"),
          question(2, "榎本揚助", "さがみみらい", "一問一答"),
        ]),
        url: "https://example.jp/ippan.pdf",
      },
      order: { parsed: order, url: "https://example.jp/juni.pdf" },
    });
    expect(
      drafts.map((d) => [
        d.listKind,
        d.kind,
        d.order,
        d.memberName,
        d.questionDate,
      ])
    ).toEqual([
      ["representative", "representative", 1, "寺田弘子", null],
      ["representative", "individual", 2, "羽生田学", null],
      ["general", "general", 1, "務川慧", "2026-09-24"],
      ["general", "general", 2, "榎本揚助", null],
    ]);
    expect(drafts[0].billRefs).toEqual(["議案第99号"]);
    expect(drafts[0].noticeDate).toBe("2026-09-01");
    expect(warnings).toEqual([
      "一般質問 順位2：通告一覧（榎本揚助）と順位表（別の人）の氏名が違います。予定日は入れていません",
    ]);
  });
});

describe("planQuestionImport", () => {
  const { drafts } = buildQuestionDrafts({
    ...base,
    general: {
      notice: notice("general", [
        question(1, "務川慧", "自民党", "一問一答"),
        question(2, "榎本揚助", "さがみみらい"),
      ]),
      url: null,
    },
  });
  const row = (over: Partial<ExistingQuestion>): ExistingQuestion => ({
    id: "id",
    list_kind: "general",
    order_no: 1,
    is_published: false,
    operator_edited_at: null,
    site_snapshot: null,
    ...over,
  });

  it("DB がキーの順番を変えて返しても、同じ内容なら変わっていないとみなす", () => {
    const snapshot = snapshotOf(drafts[0]);
    const reordered = Object.fromEntries(Object.entries(snapshot).reverse());
    expect(stableStringify(reordered)).toBe(stableStringify(snapshot));
    const plan = planQuestionImport(
      drafts.slice(0, 1),
      [row({ id: "a", order_no: 1, site_snapshot: reordered })],
      ["general"]
    );
    expect(plan.unchanged).toBe(1);
  });

  it("新しい質問は足し、変わっていなければそのまま", () => {
    const plan = planQuestionImport(
      drafts,
      [row({ id: "a", order_no: 1, site_snapshot: snapshotOf(drafts[0]) })],
      ["general"]
    );
    expect(plan.inserts.map((d) => d.order)).toEqual([2]);
    expect(plan.unchanged).toBe(1);
    expect(plan.updates).toEqual([]);
  });

  it("仮登録は置き換え、公開済み・運営者が直した行は置き換えずに知らせる", () => {
    const plan = planQuestionImport(
      drafts,
      [
        row({ id: "a", order_no: 1, site_snapshot: { old: true } }),
        row({
          id: "b",
          order_no: 2,
          site_snapshot: { old: true },
          is_published: true,
        }),
      ],
      ["general"]
    );
    expect(plan.updates.map((u) => u.id)).toEqual(["a"]);
    expect(plan.pending.map((p) => p.id)).toEqual(["b"]);
  });

  it("一覧から消えた行は、仮登録なら消し、公開済みなら知らせる。取り込まなかった一覧の行は触らない", () => {
    const plan = planQuestionImport(
      drafts,
      [
        row({ id: "x", order_no: 3 }),
        row({
          id: "y",
          order_no: 4,
          operator_edited_at: "2026-11-07T00:00:00Z",
        }),
        row({ id: "z", list_kind: "representative", order_no: 9 }),
      ],
      ["general"]
    );
    expect(plan.removed).toEqual([
      { id: "x", locked: false },
      { id: "y", locked: true },
    ]);
  });
});
