import { describe, expect, it } from "vitest";
import {
  councilYearOf,
  daysBetween,
  extractCouncilPeriods,
  formatMeetingDate,
  formatMeetingDateRange,
  getCouncilStatus,
  isUpcoming,
  resolveCouncilPeriods,
  takeFirstDays,
} from "./council-period";

const plenary = (meeting_date: string, name: string) => ({
  meeting_date,
  name,
  category: "plenary" as const,
});

const meetings = [
  plenary("2026-05-29", "本会議（招集議会）"),
  plenary("2026-06-12", "本会議（6月議会初日）"),
  plenary("2026-06-15", "本会議"),
  plenary("2026-06-30", "本会議（6月議会最終日）"),
  plenary("2026-11-26", "本会議（11月議会初日）"),
  plenary("2026-12-10", "本会議（11月議会最終日）"),
];

describe("extractCouncilPeriods", () => {
  it("初日と最終日の本会議から議会期間を作る", () => {
    expect(extractCouncilPeriods(meetings)).toEqual([
      { name: "招集議会", start_date: "2026-05-29", end_date: "2026-05-29" },
      { name: "6月議会", start_date: "2026-06-12", end_date: "2026-06-30" },
      { name: "11月議会", start_date: "2026-11-26", end_date: "2026-12-10" },
    ]);
  });

  it("最終日が未掲載の議会期間は出さない", () => {
    expect(
      extractCouncilPeriods([plenary("2027-02-01", "本会議（2月議会初日）")])
    ).toEqual([]);
  });
});

describe("resolveCouncilPeriods", () => {
  it("会期管理で入力した期間があればそれを開始日順に使う", () => {
    const configured = [
      {
        name: "12月定例会議",
        start_date: "2026-11-26",
        end_date: "2026-12-18",
      },
      { name: "6月定例会議", start_date: "2026-05-28", end_date: "2026-06-26" },
    ];
    expect(
      resolveCouncilPeriods(configured, meetings).map((p) => p.name)
    ).toEqual(["6月定例会議", "12月定例会議"]);
  });

  it("入力が無ければ会議予定の本会議名から導く", () => {
    expect(resolveCouncilPeriods([], meetings)).toEqual(
      extractCouncilPeriods(meetings)
    );
  });
});

describe("getCouncilStatus", () => {
  const periods = extractCouncilPeriods(meetings);

  it("議会期間の外なら次の議会期間を返す", () => {
    const status = getCouncilStatus(periods, "2026-10-22", 2026);
    expect(status.currentPeriod).toBeNull();
    expect(status.nextPeriod?.name).toBe("11月議会");
  });

  it("初日と最終日は議会期間に含める", () => {
    expect(
      getCouncilStatus(periods, "2026-11-26", 2026).currentPeriod?.name
    ).toBe("11月議会");
    expect(
      getCouncilStatus(periods, "2026-12-10", 2026).currentPeriod?.name
    ).toBe("11月議会");
  });
});

describe("councilYearOf", () => {
  it("議会年度は5月始まり", () => {
    expect(councilYearOf(new Date(2026, 3, 30))).toBe(2025);
    expect(councilYearOf(new Date(2026, 4, 1))).toBe(2026);
  });
});

describe("isUpcoming", () => {
  it("複数日の会議は最終日まで今後の会議として扱う", () => {
    const m = { meeting_date: "2026-10-28", end_date: "2026-10-30" };
    expect(isUpcoming(m, "2026-10-29")).toBe(true);
    expect(isUpcoming(m, "2026-10-31")).toBe(false);
  });
});

describe("日付の表示", () => {
  it("曜日つきで出す", () => {
    expect(formatMeetingDate("2026-11-26")).toBe("11月26日（木）");
  });

  it("日数差を数える", () => {
    expect(daysBetween("2026-10-22", "2026-11-26")).toBe(35);
  });
});

describe("takeFirstDays", () => {
  it("同じ日の会議は途中で切らない", () => {
    const ms = [
      { meeting_date: "2026-10-23", end_date: null },
      { meeting_date: "2026-10-28", end_date: "2026-10-30" },
      { meeting_date: "2026-10-28", end_date: "2026-10-30" },
      { meeting_date: "2026-11-02", end_date: null },
    ];
    expect(takeFirstDays(ms, 2)).toHaveLength(3);
  });

  it("同じ月の期間は後ろの月を省く", () => {
    expect(formatMeetingDateRange("2026-10-28", "2026-10-30")).toBe(
      "10月28日（水）〜30日（金）"
    );
  });
});
