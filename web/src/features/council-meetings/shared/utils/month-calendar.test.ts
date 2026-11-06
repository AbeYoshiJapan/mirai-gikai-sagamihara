import { describe, expect, it } from "vitest";
import type { CouncilMeeting } from "../types";
import {
  buildMonthGrid,
  calendarCellLabel,
  gridRange,
  meetingsByDate,
  monthKeyOf,
  parseMonthParam,
  periodOnDate,
  periodsInMonth,
  shiftYearMonth,
} from "./month-calendar";

function meeting(overrides: Partial<CouncilMeeting>): CouncilMeeting {
  return {
    id: "m",
    meeting_date: "2026-11-17",
    end_date: null,
    name: "本会議",
    category: "plenary",
    start_time: null,
    place: null,
    gallery: null,
    topic: null,
    document_url: null,
    council_year: 2026,
    source_url: "",
    ...overrides,
  };
}

describe("parseMonthParam / shiftYearMonth / monthKeyOf", () => {
  it("YYYY-MM を読み、読めなければ今日の月", () => {
    expect(parseMonthParam("2026-12", "2026-11-06")).toEqual({
      year: 2026,
      month: 12,
    });
    expect(parseMonthParam("2026-13", "2026-11-06")).toEqual({
      year: 2026,
      month: 11,
    });
    expect(parseMonthParam(undefined, "2026-11-06")).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it("年をまたいで月を送る", () => {
    expect(shiftYearMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
    expect(shiftYearMonth({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
    expect(monthKeyOf({ year: 2027, month: 1 })).toBe("2027-01");
  });
});

describe("buildMonthGrid", () => {
  it("2026年11月は日曜の 1 日から始まり、最後の週は 12/5 まで", () => {
    const weeks = buildMonthGrid({ year: 2026, month: 11 });
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({
      date: "2026-11-01",
      day: 1,
      inMonth: true,
      weekday: 0,
    });
    expect(weeks[4][6]).toMatchObject({ date: "2026-12-05", inMonth: false });
    expect(gridRange(weeks)).toEqual({ from: "2026-11-01", to: "2026-12-05" });
  });

  it("2026年12月は前の月の 29・30 日から始まる", () => {
    const weeks = buildMonthGrid({ year: 2026, month: 12 });
    expect(weeks[0][0]).toMatchObject({ date: "2026-11-29", inMonth: false });
    expect(weeks[0][2]).toMatchObject({ date: "2026-12-01", inMonth: true });
  });
});

describe("meetingsByDate / calendarCellLabel", () => {
  it("複数日の会議は、その間の日すべてに入れる", () => {
    const byDate = meetingsByDate([
      meeting({ id: "a" }),
      meeting({
        id: "b",
        meeting_date: "2026-11-18",
        end_date: "2026-11-20",
        name: "管外行政調査",
        category: "other",
      }),
    ]);
    expect(byDate.get("2026-11-17")?.map((m) => m.id)).toEqual(["a"]);
    expect(byDate.get("2026-11-19")?.map((m) => m.id)).toEqual(["b"]);
    expect(byDate.get("2026-11-20")?.map((m) => m.id)).toEqual(["b"]);
  });

  it("マスには略称、なければ「委員会」を省いた名前", () => {
    expect(
      calendarCellLabel({ name: "議会運営委員会", site_label: "議運" })
    ).toBe("議運");
    expect(calendarCellLabel({ name: "総務委員会", site_label: null })).toBe(
      "総務"
    );
  });
});

describe("periodOnDate / periodsInMonth", () => {
  const periods = [
    { name: "9月定例会議", start_date: "2026-08-28", end_date: "2026-10-09" },
    { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
  ];

  it("その日を含む期間", () => {
    expect(periodOnDate("2026-11-20", periods)?.name).toBe("12月定例会議");
    expect(periodOnDate("2026-11-10", periods)).toBeNull();
  });

  it("月に重なる期間", () => {
    expect(
      periodsInMonth({ year: 2026, month: 10 }, periods).map((p) => p.name)
    ).toEqual(["9月定例会議"]);
    expect(
      periodsInMonth({ year: 2026, month: 12 }, periods).map((p) => p.name)
    ).toEqual(["12月定例会議"]);
  });
});
