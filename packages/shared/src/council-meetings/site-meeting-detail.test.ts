import { describe, expect, it } from "vitest";
import { parseSiteMeetingDetailHtml } from "./site-meeting-detail";

describe("parseSiteMeetingDetailHtml", () => {
  it("「日時」「場所」の行から開催日・開始時刻・場所を読む（更新日は読まない）", () => {
    const html = `<html><head><title>本会議 | 相模原市議会</title></head><body>
      <header><h1><img alt="相模原市議会"></h1></header>
      <div id="main"><h1>本会議</h1>
        <p class="update">更新日：2026年9月30日</p>
        <p>日時：令和8年11月17日（火曜日）午前9時30分</p>
        <p>場所：本会議場</p>
      </div></body></html>`;
    expect(parseSiteMeetingDetailHtml(html)).toEqual({
      title: "本会議",
      date: "2026-11-17",
      startTime: "午前9時30分",
      place: "本会議場",
    });
  });

  it("表の形（見出しのマスと値のマス）でも読む", () => {
    const html = `<div><h1>総務委員会</h1><table>
      <tr><th>日時</th><td>2026年12月1日　10時00分</td></tr>
      <tr><th>場所</th><td>第１委員会室</td></tr></table></div>`;
    expect(parseSiteMeetingDetailHtml(html)).toEqual({
      title: "総務委員会",
      date: "2026-12-01",
      startTime: "10時00分",
      place: "第1委員会室",
    });
  });

  it("日付の見出しが次の行にあっても読み、「場所」が無ければ部屋の名前を拾う", () => {
    const html = `<h2>議会運営委員会</h2><dl><dt>開催日</dt><dd>令和8年11月10日 午後1時</dd></dl>
      <p>会場は全員協議会室です</p>`;
    expect(parseSiteMeetingDetailHtml(html)).toMatchObject({
      title: "議会運営委員会",
      date: "2026-11-10",
      startTime: "午後1時",
      place: "全員協議会室",
    });
  });

  it("読めないものは null（見出しが会議名らしくなければ title も null）", () => {
    expect(parseSiteMeetingDetailHtml("<h1>お知らせ</h1><p>詳細は後日</p>")).toEqual({
      title: null,
      date: null,
      startTime: null,
      place: null,
    });
  });
});
