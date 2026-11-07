import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { ParsedNoticeList, ParsedQuestionOrder, PdfLine } from "../types";
import { flattenItems, parseItemHead, parseNoticeList } from "./parse-notice";
import { parseQuestionOrder } from "./parse-question-order";
import { extractPdfLines } from "./pdf-lines";

// 相模原市議会が公表した通告一覧（令和8年3月・6月・9月定例会議）
const fixture = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "fixtures", name)));

const line = (...runs: string[]): PdfLine => ({
  page: 1,
  y: 100,
  runs: runs.map((text, index) => ({ x: 60 + index * 40, text })),
  text: runs.join(" "),
});

describe("parseItemHead", () => {
  it("1 → (1) → ア → （ア）の番号を読み、文言は書き換えない", () => {
    expect(
      parseItemHead(line("１　ＡＩの活用による行政のＤＸ推進について"))
    ).toEqual({
      label: "1",
      level: 1,
      text: "ＡＩの活用による行政のＤＸ推進について",
    });
    expect(parseItemHead(line("１０　議案第９９号について"))).toMatchObject({
      label: "10",
      text: "議案第９９号について",
    });
    expect(parseItemHead(line("(1)", "現状について"))).toEqual({
      label: "(1)",
      level: 2,
      text: "現状について",
    });
    expect(parseItemHead(line("ア", "持続可能な対策について"))).toMatchObject({
      label: "ア",
      level: 3,
    });
    expect(
      parseItemHead(line("（ア）出生率向上に向けた取組の成果について"))
    ).toEqual({
      label: "（ア）",
      level: 4,
      text: "出生率向上に向けた取組の成果について",
    });
  });

  it("（ア）の下の ａ → （ａ）も読む", () => {
    expect(
      parseItemHead(
        line("ａ　全庁での本格導入に向けた取組とガイドラインの作成")
      )
    ).toEqual({
      label: "ａ",
      level: 5,
      text: "全庁での本格導入に向けた取組とガイドラインの作成",
    });
    expect(parseItemHead(line("（ｂ）", "コールセンターの再構築"))).toEqual({
      label: "（ｂ）",
      level: 6,
      text: "コールセンターの再構築",
    });
  });

  it("折り返しの続きは番号として読まない", () => {
    expect(parseItemHead(line("５号令和７年度相模原市麻溝台"))).toBeNull();
    expect(parseItemHead(line("いて"))).toBeNull();
    expect(parseItemHead(line("アプリの活用について"))).toBeNull();
    expect(parseItemHead(line("ｅスポーツの振興について"))).toBeNull();
  });
});

describe("通告一覧の PDF（令和8年9月定例会議）", () => {
  let general: ParsedNoticeList;
  let representative: ParsedNoticeList;
  let order: ParsedQuestionOrder;

  beforeAll(async () => {
    general = parseNoticeList(
      await extractPdfLines(fixture("2026_ippantsukoku_09.pdf"))
    );
    representative = parseNoticeList(
      await extractPdfLines(fixture("2026_tsukoku_09.pdf"))
    );
    order = parseQuestionOrder(
      await extractPdfLines(fixture("2026_juni_09.pdf"))
    );
  }, 60_000);

  it("一般質問通告一覧：20 人を順位・議席・氏名・会派・方式と項目に分ける", () => {
    expect(general.listKind).toBe("general");
    expect(general.noticeDate).toBe("2026-09-24");
    expect(general.warnings).toEqual([]);
    expect(general.questions.map((q) => q.order)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1)
    );
    const first = general.questions[0];
    expect(first).toMatchObject({
      order: 1,
      seatNumber: 9,
      memberName: "務川慧",
      factionLabel: "自民党",
      method: "一問一答",
    });
    expect(first.items.map((item) => item.text)).toEqual([
      "ＡＩの活用による行政のＤＸ推進について",
      "物価高騰対策について",
      "史跡勝坂遺跡公園について",
    ]);
    expect(first.items[0].children.map((item) => item.label)).toEqual([
      "(1)",
      "(2)",
      "(3)",
      "(4)",
      "(5)",
    ]);
  });

  it("行の途中で折り返した文言はつなぐ", () => {
    const third = general.questions[2];
    expect(third.memberName).toBe("中村忠辰");
    expect(third.items[0].children[3].text).toBe(
      "市民の命を守る避難所・避難場所へのペットの受入れ体制整備について"
    );
  });

  it("代表質問・個人質疑通告一覧：画面に出ない重ね文字を拾わない", () => {
    expect(representative.listKind).toBe("representative");
    expect(representative.noticeDate).toBe("2026-09-01");
    expect(representative.warnings).toEqual([]);
    expect(representative.questions).toHaveLength(7);
    const first = representative.questions[0];
    expect(first).toMatchObject({
      order: 1,
      seatNumber: 44,
      memberName: "寺田弘子",
      factionLabel: "自民党",
      method: null,
    });
    expect(first.items[1].text).toBe(
      "議案第９９号令和７年度相模原市一般会計歳入歳出決算及び議案第１０５号令和７年度相模原市麻溝台・新磯野第一整備地区土地区画整理事業特別会計歳入歳出決算"
    );
    // エ 主な事業について の下は（ア）〜（ケ）。重なって隠れた古い文字（リニア…・道路整備…の繰り返し）は入らない
    const mainProjects = first.items[1].children[2].children[3];
    expect(mainProjects.text).toBe("主な事業について");
    expect(mainProjects.children.map((item) => item.text)).toEqual([
      "ＳＤＧｓの推進について",
      "包括的な支援体制の整備について",
      "子育て応援推進事業について",
      "新斎場整備事業について",
      "林道復旧事業について",
      "グリーンスローモビリティ運行支援事業について",
      "全国学力・学習状況調査の結果の推移について",
      "市立博物館におけるプラネタリウムのリニューアルについて",
      "消防団活動費について",
    ]);
    const all = flattenItems(first.items).map((item) => item.text);
    expect(
      all.filter((text) => text.includes("リニア中央新幹線"))
    ).toHaveLength(1);
    expect(representative.questions[6]).toMatchObject({
      memberName: "羽生田学",
      factionLabel: "無所属",
    });
  });

  it("一般質問順位：予定日は、日付のセルの高さから行をまとめて決める", () => {
    expect(order).toMatchObject({ year: 2026, month: 9, warnings: [] });
    expect(order.rows).toHaveLength(20);
    const dateOf = (n: number) =>
      order.rows.find((row) => row.order === n)?.date;
    expect([1, 8].map(dateOf)).toEqual(["2026-09-24", "2026-09-24"]);
    expect([9, 16].map(dateOf)).toEqual(["2026-09-25", "2026-09-25"]);
    expect([17, 20].map(dateOf)).toEqual(["2026-09-28", "2026-09-28"]);
    expect(order.rows[3]).toMatchObject({
      order: 4,
      seatNumber: 24,
      memberName: "仁科なつ美",
      factionLabel: "立民",
      method: "一括・一問一答",
    });
  });
});

describe("ほかの定例会議の通告一覧も読める", () => {
  it.each([
    ["2026_ippantsukoku_3.pdf", "general", "2026-03-17", 21],
    ["2026_ippantsukoku_6.pdf", "general", "2026-06-26", 22],
    ["2026_tsukoku_3.pdf", "representative", "2026-02-25", 7],
    ["2026_tsukoku_06.pdf", "representative", "2026-06-08", 7],
  ])(
    "%s",
    async (file, listKind, noticeDate, count) => {
      const notice = parseNoticeList(await extractPdfLines(fixture(file)));
      expect(notice).toMatchObject({ listKind, noticeDate, warnings: [] });
      expect(notice.questions).toHaveLength(count);
      for (const question of notice.questions) {
        expect(question.items.length).toBeGreaterThan(0);
      }
    },
    30_000
  );

  it("（ア）の下の ａ・ｂ は、（ア）の文言につなげず、その下の段にする", async () => {
    const notice = parseNoticeList(
      await extractPdfLines(fixture("2026_ippantsukoku_6.pdf"))
    );
    const parent = notice.questions
      .flatMap((question) => flattenItems(question.items))
      .find((item) => item.text === "生成ＡＩの活用について");
    expect(parent?.level).toBe(4);
    expect(parent?.children).toEqual([
      {
        label: "ａ",
        level: 5,
        text: "全庁での本格導入に向けた取組とガイドラインの作成",
        children: [],
      },
      {
        label: "ｂ",
        level: 5,
        text: "コールセンターの再構築",
        children: [],
      },
    ]);
  }, 30_000);

  it.each([
    ["2026_juni_3.pdf", 3, 21],
    ["2026_juni_06.pdf", 6, 22],
  ])(
    "%s",
    async (file, month, count) => {
      const order = parseQuestionOrder(await extractPdfLines(fixture(file)));
      expect(order).toMatchObject({ year: 2026, month, warnings: [] });
      expect(order.rows).toHaveLength(count);
      expect(order.rows.every((row) => row.date !== null)).toBe(true);
    },
    30_000
  );
});
