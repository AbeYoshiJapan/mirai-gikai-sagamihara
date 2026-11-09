import { describe, expect, it } from "vitest";
import type { PrBillSource } from "../types";
import {
  buildBillDraft,
  buildCouncilQuestionsDraft,
  buildMeetingDraft,
  buildReaderOpinionsDraft,
  buildReaderQuestionDraft,
  composeWithin,
  formatMonthDayWithWeekday,
  groupLogsByKey,
  prLogKey,
} from "./pr-drafts";
import { countXWeight, X_MAX_WEIGHT } from "./x-text";

const ctx = { baseUrl: "https://example.jp/", hashtags: "#相模原市議会" };

const bill: PrBillSource = {
  id: "b1",
  title: "相模原市手数料条例の一部を改正する条例",
  billNumber: "令和8年議案第99号",
  bill_kind: "ordinance",
  stage: "decided",
  result: "passed",
  vote_outcome: "unanimous",
  decidedOn: "2026-11-26",
  updatedAt: "2026-11-26T03:00:00Z",
};

describe("formatMonthDayWithWeekday", () => {
  it("日付に曜日を付ける", () => {
    expect(formatMonthDayWithWeekday("2026-11-17")).toBe("11月17日（火）");
    expect(formatMonthDayWithWeekday("2026-12-01")).toBe("12月1日（火）");
  });
});

describe("buildBillDraft", () => {
  it("議決済みなら日付と結果を入れ、URL とハッシュタグで終える", () => {
    const draft = buildBillDraft(bill, ctx);
    expect(draft.text).toBe(
      [
        "【議案】相模原市手数料条例の一部を改正する条例",
        "令和8年議案第99号・11月26日に可決（全会一致）",
        "https://example.jp/bills/b1",
        "#相模原市議会",
      ].join("\n")
    );
    expect(draft.url).toBe("https://example.jp/bills/b1");
    expect(prLogKey(draft.sourceType, draft.sourceId)).toBe("bill:b1");
  });

  it("審議の途中のものは、状況を書かない（時期を取り違えないように）", () => {
    const draft = buildBillDraft(
      { ...bill, stage: "in_committee", result: null, decidedOn: null },
      { ...ctx, hashtags: "" }
    );
    expect(draft.text).toBe(
      [
        "【議案】相模原市手数料条例の一部を改正する条例",
        "令和8年議案第99号",
        "https://example.jp/bills/b1",
      ].join("\n")
    );
  });
});

describe("buildMeetingDraft", () => {
  it("日付・曜日・開始時刻・会議名・場所を入れ、カレンダーへ案内する", () => {
    const draft = buildMeetingDraft(
      {
        id: "m1",
        name: "本会議",
        meetingDate: "2026-11-17",
        startTime: "午前9時30分",
        place: "本会議場",
        topic: null,
      },
      ctx
    );
    expect(draft.text).toBe(
      [
        "【会議の予定】11月17日（火） 午前9時30分から",
        "本会議（本会議場）",
        "https://example.jp/schedule",
        "#相模原市議会",
      ].join("\n")
    );
  });
});

describe("buildCouncilQuestionsDraft", () => {
  it("区分ごとの人数と、一般質問の日程を入れる", () => {
    const draft = buildCouncilQuestionsDraft(
      {
        meetingKey: "2026-09",
        meetingName: "令和8年9月定例会議",
        counts: { representative: 6, individual: 1, general: 20 },
        generalDates: ["2026-09-24", "2026-09-25", "2026-09-28"],
      },
      ctx
    );
    expect(draft.text).toBe(
      [
        "【議会での質問】令和8年9月定例会議",
        "代表質問6人・個人質疑1人・一般質問20人の通告の内容を載せました。",
        "一般質問の日程：9月24日（木）〜9月28日（月）",
        "https://example.jp/council-questions/2026-09",
        "#相模原市議会",
      ].join("\n")
    );
  });
});

describe("buildReaderOpinionsDraft", () => {
  it("意見の欄へ案内し、投稿者の文は引用しない", () => {
    const draft = buildReaderOpinionsDraft(
      {
        billId: "b1",
        billTitle: "手数料条例の改正",
        count: 3,
        latestPublishedAt: null,
      },
      ctx
    );
    expect(draft.text).toBe(
      [
        "【いただいた意見】",
        "「手数料条例の改正」に寄せられた意見を3件紹介しています。",
        "https://example.jp/bills/b1#reader-opinions-heading",
        "#相模原市議会",
      ].join("\n")
    );
  });
});

describe("buildReaderQuestionDraft", () => {
  it("議案への質問は議案のページの質問欄へ、そうでなければ質問と回答のページへ案内する", () => {
    const onBill = buildReaderQuestionDraft(
      {
        id: "q1",
        kind: "question",
        billId: "b1",
        billTitle: "手数料条例の改正",
        question: "手数料は\nいくら上がりますか？",
        publishedAt: null,
      },
      ctx
    );
    expect(onBill.text).toBe(
      [
        "【いただいた質問に回答しました】",
        "Q. 手数料は いくら上がりますか？",
        "（議案：手数料条例の改正）",
        "https://example.jp/bills/b1#reader-questions-heading",
        "#相模原市議会",
      ].join("\n")
    );

    const general = buildReaderQuestionDraft(
      {
        id: "q2",
        kind: "question",
        billId: null,
        billTitle: null,
        question: "傍聴はできますか？",
        publishedAt: null,
      },
      ctx
    );
    expect(general.url).toBe("https://example.jp/questions");
    expect(general.note).toBe("サイト全体への質問");
  });

  it("意見として届いたものは、意見への返事として紹介する", () => {
    const draft = buildReaderQuestionDraft(
      {
        id: "q4",
        kind: "opinion",
        billId: null,
        billTitle: null,
        question: "傍聴席を増やしてほしい",
        publishedAt: null,
      },
      ctx
    );
    expect(draft.text).toBe(
      [
        "【いただいた意見にお返事しました】",
        "意見：傍聴席を増やしてほしい",
        "https://example.jp/questions",
        "#相模原市議会",
      ].join("\n")
    );
    expect(draft.note).toBe("サイト全体への意見");
  });

  it("長い質問は、全体が X の上限に収まるように質問の行だけを縮める", () => {
    const draft = buildReaderQuestionDraft(
      {
        id: "q3",
        kind: "question",
        billId: null,
        billTitle: null,
        question: "あ".repeat(400),
        publishedAt: null,
      },
      ctx
    );
    expect(countXWeight(draft.text)).toBeLessThanOrEqual(X_MAX_WEIGHT);
    expect(draft.text).toContain("…\nhttps://example.jp/questions");
  });
});

describe("composeWithin", () => {
  it("空の行は入れない", () => {
    expect(composeWithin(["a", null, "", "b"], 0)).toBe("a\nb");
  });
});

describe("groupLogsByKey", () => {
  it("話題ごとに、新しい順のまままとめる", () => {
    const logs = [
      {
        id: "l2",
        sourceType: "bill" as const,
        sourceId: "b1",
        body: "2",
        postedAt: "2026-11-09T02:00:00Z",
      },
      {
        id: "l1",
        sourceType: "bill" as const,
        sourceId: "b1",
        body: "1",
        postedAt: "2026-11-08T02:00:00Z",
      },
      {
        id: "l3",
        sourceType: "meeting" as const,
        sourceId: "b1",
        body: "3",
        postedAt: "2026-11-07T02:00:00Z",
      },
    ];
    const grouped = groupLogsByKey(logs);
    expect(grouped["bill:b1"].map((log) => log.id)).toEqual(["l2", "l1"]);
    expect(grouped["meeting:b1"].map((log) => log.id)).toEqual(["l3"]);
  });
});
