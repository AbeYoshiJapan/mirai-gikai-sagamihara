import { describe, expect, it } from "vitest";
import { resolveCalendarMonthTemplate } from "./calendar-source";

describe("resolveCalendarMonthTemplate", () => {
  it("設定の URL があればそれを使う", () => {
    expect(
      resolveCalendarMonthTemplate({
        calendarMonthUrl: " https://example.jp/cal/{yyyy}-{mm} ",
        councilSite: "https://www.sagamihara-shigikai.jp/",
      })
    ).toBe("https://example.jp/cal/{yyyy}-{mm}");
  });

  it("空なら議会の公式サイトの URL から作る（相模原市議会の形）", () => {
    expect(
      resolveCalendarMonthTemplate({
        calendarMonthUrl: "",
        councilSite: "https://www.sagamihara-shigikai.jp/",
      })
    ).toBe("https://www.sagamihara-shigikai.jp/top/{yyyy}/{mm}/");
  });

  it("どちらも無ければ null", () => {
    expect(
      resolveCalendarMonthTemplate({ calendarMonthUrl: "", councilSite: "" })
    ).toBeNull();
  });
});
