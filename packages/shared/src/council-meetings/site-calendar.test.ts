import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCalendarMonthUrl,
  calendarMonthsFrom,
  calendarRangeOf,
  describeCalendarHtml,
  groupCalendarEntries,
  parseSiteCalendarHtml,
} from "./site-calendar";

const BASE = "https://www.sagamihara-shigikai.jp/top/2026/11/";
const TOP_2026_11 = readFileSync(
  path.join(__dirname, "__fixtures__/sagamihara-top-2026-11.html"),
  "utf8"
);

describe("parseSiteCalendarHtml", () => {
  it("相模原市議会のカレンダー（2026年11月）から会議の日付・略称・詳細ページを読む", () => {
    const entries = parseSiteCalendarHtml(TOP_2026_11, {
      year: 2026,
      month: 11,
      baseUrl: BASE,
    });
    expect(entries.map((e) => [e.date, e.label])).toEqual([
      ["2026-11-10", "議運"],
      ["2026-11-17", "本会議"],
      ["2026-11-26", "本会議"],
      ["2026-11-27", "本会議予備日"],
      // 表の最後の行は 12 月のマス
      ["2026-12-01", "総務"],
      ["2026-12-02", "民生"],
      ["2026-12-03", "市民環境経済"],
      ["2026-12-04", "こども文教"],
    ]);
    expect(entries[0].url).toBe(
      "https://www.sagamihara-shigikai.jp/doc-calendar/2026093000015/"
    );
  });

  it("祝日（リンクのない文字）や、表の外のリンクは拾わない", () => {
    const entries = parseSiteCalendarHtml(TOP_2026_11, {
      year: 2026,
      month: 11,
      baseUrl: BASE,
    });
    expect(entries.some((e) => e.label.includes("文化の日"))).toBe(false);
    expect(entries.some((e) => e.url.includes("2014011000117"))).toBe(false);
  });

  it("表の先頭が前の月の末日のときは、前の月の日付にする", () => {
    const html = `<table><caption>2026年12月</caption>
      <tr><td>29</td><td>30<a href="/doc-calendar/a/">建設</a></td><td>1</td></tr>
      <tr><td>2<a href="/doc-calendar/b/">議運</a></td></tr></table>`;
    const entries = parseSiteCalendarHtml(html, {
      year: 2026,
      month: 12,
      baseUrl: BASE,
    });
    expect(entries.map((e) => e.date)).toEqual(["2026-11-30", "2026-12-02"]);
  });

  it("表に年月が無ければ、ページの年月を使う。年をまたぐ月送りも正しく数える", () => {
    const html = `<table>
      <tr><td>31<a href="/doc-calendar/x/">本会議</a></td><td>1</td><td>2<a href="/doc-calendar/y/">議運</a></td></tr></table>`;
    const entries = parseSiteCalendarHtml(html, {
      year: 2027,
      month: 1,
      baseUrl: BASE,
    });
    expect(entries.map((e) => e.date)).toEqual(["2026-12-31", "2027-01-02"]);
  });

  it("会議のリンクがある表が無ければ空", () => {
    expect(
      parseSiteCalendarHtml("<table><tr><td>1</td></tr></table>", {
        year: 2026,
        month: 11,
        baseUrl: BASE,
      })
    ).toEqual([]);
  });
});

describe("groupCalendarEntries", () => {
  it("同じ詳細ページの会議は 1 件にまとめ、複数日なら終了日を付ける", () => {
    const grouped = groupCalendarEntries([
      { date: "2026-12-01", label: "総務", url: "u1" },
      { date: "2026-11-10", label: "議運", url: "u2" },
      { date: "2026-12-01", label: "総務", url: "u1" },
      { date: "2026-12-03", label: "視察", url: "u3" },
      { date: "2026-12-04", label: "視察", url: "u3" },
    ]);
    expect(grouped).toEqual([
      { url: "u2", label: "議運", date: "2026-11-10", endDate: null },
      { url: "u1", label: "総務", date: "2026-12-01", endDate: null },
      { url: "u3", label: "視察", date: "2026-12-03", endDate: "2026-12-04" },
    ]);
  });
});

describe("月のページの URL と範囲", () => {
  it("{yyyy} {mm} を差し込む", () => {
    expect(
      buildCalendarMonthUrl(
        "https://www.sagamihara-shigikai.jp/top/{yyyy}/{mm}/",
        2026,
        1
      )
    ).toBe("https://www.sagamihara-shigikai.jp/top/2026/01/");
  });

  it("今月から 3 か月分。年をまたぐ", () => {
    const months = calendarMonthsFrom("2026-11-06");
    expect(months).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
    expect(calendarRangeOf(months)).toEqual({
      from: "2026-11-01",
      to: "2027-01-31",
    });
  });
});

describe("describeCalendarHtml", () => {
  it("読めなかったページの手がかり（タイトル・表の数・会議へのリンクの数）を返す", () => {
    expect(
      describeCalendarHtml(
        "<html><title> 相模原市議会 </title><table></table><p>x</p></html>"
      )
    ).toBe("タイトル「相模原市議会」・表 1 個・会議へのリンク 0 件・59 文字");
  });

  it("実際のカレンダーでは会議へのリンクを数える", () => {
    expect(describeCalendarHtml(TOP_2026_11)).toMatch(
      /表 \d+ 個・会議へのリンク [1-9]\d* 件/
    );
  });
});
