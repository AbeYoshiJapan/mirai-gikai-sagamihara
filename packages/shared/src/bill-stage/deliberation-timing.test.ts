import { describe, expect, it } from "vitest";
import {
  buildDeliberationTimeline,
  getDeliberationTiming,
  type TimelineSessionInput,
  toJstDateKeyOf,
} from "./deliberation-timing";

// 通年の会期の中に、9月と12月の定例会議の期間を入れた形
const YEAR: TimelineSessionInput = {
  id: "year",
  start_date: "2026-04-22",
  end_date: "2027-03-22",
  is_active: true,
  meeting_periods: [
    { name: "9月定例会議", start_date: "2026-08-27", end_date: "2026-10-02" },
    { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
  ],
};

const timing = (
  today: string,
  submitted: string | null,
  sessions: TimelineSessionInput[] = [YEAR],
  sessionId = "year"
) =>
  getDeliberationTiming(
    { submitted_date: submitted, diet_session_id: sessionId },
    buildDeliberationTimeline(sessions, today)
  );

describe("getDeliberationTiming（期間を入れている場合）", () => {
  it("定例会議と定例会議の間は、前の定例会議から持ち越した議案を「継続中」にする", () => {
    expect(timing("2026-11-07", "2026-09-30")).toBe("carried_over");
    expect(timing("2026-10-20", "2026-08-27")).toBe("carried_over");
  });

  it("定例会議の期間中は、持ち越した議案も含めて「審議中」", () => {
    expect(timing("2026-11-20", "2026-09-30")).toBe("in_session");
    expect(timing("2026-09-10", "2026-08-27")).toBe("in_session");
  });

  it("前の定例会議が終わった後に出た議案は、いつ出たかに関係なく「審議予定」", () => {
    // 9月定例会議（10/2 まで）の翌日以降に出たもの
    expect(timing("2026-11-12", "2026-10-03")).toBe("upcoming");
    expect(timing("2026-11-12", "2026-10-20")).toBe("upcoming");
    expect(timing("2026-11-12", "2026-11-10")).toBe("upcoming");
    // 提出日が先（本会議に上程される日）
    expect(timing("2026-11-07", "2026-11-17")).toBe("upcoming");
  });

  it("前の定例会議の最終日までに出ていた議案は「継続中」", () => {
    expect(timing("2026-11-12", "2026-10-02")).toBe("carried_over");
  });

  it("提出日が分からなければ決めない", () => {
    expect(timing("2026-11-07", null)).toBeNull();
  });

  it("終わった定例会議の期間が入っていなければ、次の定例会議を待つ議案として「審議予定」", () => {
    const onlyDecember: TimelineSessionInput = {
      ...YEAR,
      meeting_periods: [
        { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
      ],
    };
    expect(timing("2026-11-07", "2026-09-30", [onlyDecember])).toBe(
      "upcoming"
    );
  });

  it("終わった定例会議の期間が入っていなくても、前の会期の議案は「継続中」", () => {
    const sept: TimelineSessionInput = {
      id: "sept",
      start_date: "2026-08-27",
      end_date: "2026-10-02",
      is_active: false,
      meeting_periods: [],
    };
    const dec: TimelineSessionInput = {
      id: "dec",
      start_date: "2026-11-17",
      end_date: "2026-12-18",
      is_active: true,
      meeting_periods: [
        { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
      ],
    };
    expect(timing("2026-11-07", "2026-09-30", [sept, dec], "sept")).toBe(
      "carried_over"
    );
    expect(timing("2026-11-07", "2026-11-04", [sept, dec], "dec")).toBe(
      "upcoming"
    );
  });

  it("期間は会期をまたいで合わせて使う（定例会議ごとに会期を作った場合も）", () => {
    const sept: TimelineSessionInput = {
      id: "sept",
      start_date: "2026-08-27",
      end_date: "2026-10-02",
      is_active: false,
      meeting_periods: [
        { name: "9月定例会議", start_date: "2026-08-27", end_date: "2026-10-02" },
      ],
    };
    const dec: TimelineSessionInput = {
      id: "dec",
      start_date: "2026-11-17",
      end_date: "2026-12-18",
      is_active: true,
      meeting_periods: [
        { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
      ],
    };
    expect(timing("2026-11-07", "2026-09-30", [sept, dec], "sept")).toBe(
      "carried_over"
    );
    expect(timing("2026-11-25", "2026-09-30", [sept, dec], "sept")).toBe(
      "in_session"
    );
  });
});

describe("getDeliberationTiming（期間をどこにも入れていない場合は会期で判断）", () => {
  const withoutPeriods = (s: TimelineSessionInput) => ({
    ...s,
    meeting_periods: [],
  });
  const year = withoutPeriods({ ...YEAR, is_active: false });
  const dec = withoutPeriods({
    id: "dec",
    start_date: "2026-11-17",
    end_date: "2026-12-18",
    is_active: true,
    meeting_periods: [],
  });

  it("アクティブな会期より前の会期の議案は「継続中」", () => {
    expect(timing("2026-11-07", "2026-09-30", [year, dec], "year")).toBe(
      "carried_over"
    );
  });

  it("まだ始まっていない会期の議案は「審議予定」、会期中は「審議中」", () => {
    expect(timing("2026-11-07", "2026-11-17", [year, dec], "dec")).toBe(
      "upcoming"
    );
    expect(timing("2026-11-20", "2026-11-17", [year, dec], "dec")).toBe(
      "in_session"
    );
  });

  it("終わった会期の議案は「継続中」。会期が分からなければ決めない", () => {
    expect(timing("2026-12-25", "2026-11-17", [year, dec], "dec")).toBe(
      "carried_over"
    );
    expect(timing("2026-11-07", "2026-09-30", [year, dec], "unknown")).toBeNull();
  });
});

describe("buildDeliberationTimeline", () => {
  it("会期をまたいだ同じ期間は一つにまとめ、開始日順に並べる", () => {
    const timeline = buildDeliberationTimeline(
      [
        YEAR,
        {
          id: "dec",
          start_date: "2026-11-17",
          end_date: "2026-12-18",
          is_active: false,
          meeting_periods: [
            { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
          ],
        },
      ],
      "2026-11-07"
    );
    expect(timeline.periods.map((p) => p.name)).toEqual([
      "9月定例会議",
      "12月定例会議",
    ]);
    expect(timeline.activeSession).toEqual({ id: "year", start_date: "2026-04-22" });
  });
});

describe("toJstDateKeyOf", () => {
  it("日時（UTC）は日本時間の日付にする", () => {
    expect(toJstDateKeyOf("2026-11-16T15:00:00+00:00")).toBe("2026-11-17");
    expect(toJstDateKeyOf("2026-11-16 15:00:00+00")).toBe("2026-11-17");
  });

  it("日付だけならそのまま、空や壊れた値は null", () => {
    expect(toJstDateKeyOf("2026-09-30")).toBe("2026-09-30");
    expect(toJstDateKeyOf(null)).toBeNull();
    expect(toJstDateKeyOf("not a date")).toBeNull();
  });

  it("日時で来た提出日でも、日本時間の日付で判断する", () => {
    // 日本時間 11/17 0 時（UTC では 11/16）に出された議案は、12/1（期間中）は審議中
    expect(
      getDeliberationTiming(
        { submitted_date: "2026-11-16T15:00:00+00:00", diet_session_id: "year" },
        buildDeliberationTimeline([YEAR], "2026-11-12")
      )
    ).toBe("upcoming");
  });
});
