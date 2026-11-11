import { describe, expect, it } from "vitest";
import type { MeetingPeriod } from "../diet-sessions/meeting-periods";
import {
  findAgendaMeetingPeriod,
  provisionalSubmittedDate,
} from "./submitted-date";

const periods: MeetingPeriod[] = [
  { name: "12月定例会議", start_date: "2026-11-17", end_date: "2026-12-18" },
  { name: "6月定例会議", start_date: "2026-05-28", end_date: "2026-06-26" },
  { name: "9月定例会議", start_date: "2026-08-24", end_date: "2026-09-30" },
];

describe("findAgendaMeetingPeriod", () => {
  it("一覧の会議名と同じ名前の期間を選ぶ（全角数字や空白の違いはならす）", () => {
    expect(
      findAgendaMeetingPeriod(
        { label: "１２月定例会議", as_of: "2026-11-10" },
        periods
      )?.start_date
    ).toBe("2026-11-17");
    expect(
      findAgendaMeetingPeriod({ label: "9月 定例会議", as_of: null }, periods)
        ?.start_date
    ).toBe("2026-08-24");
  });

  it("名前が合わなければ、一覧の日付を含む期間を選ぶ", () => {
    expect(
      findAgendaMeetingPeriod(
        { label: "第3回定例会", as_of: "2026-09-10" },
        periods
      )?.name
    ).toBe("9月定例会議");
  });

  it("名前が合わず日付も含まなければ、31 日以内に始まる期間を選ぶ", () => {
    expect(
      findAgendaMeetingPeriod({ label: null, as_of: "2026-11-10" }, periods)
        ?.name
    ).toBe("12月定例会議");
    expect(
      findAgendaMeetingPeriod({ label: null, as_of: "2026-10-01" }, periods)
    ).toBeNull();
  });

  it("期間が入っていなければ null", () => {
    expect(
      findAgendaMeetingPeriod({ label: "12月定例会議", as_of: "2026-11-10" }, [])
    ).toBeNull();
  });
});

describe("provisionalSubmittedDate", () => {
  const december = periods[0];

  it("開会前の一覧なら、定例会議の初日を提出日にする", () => {
    expect(
      provisionalSubmittedDate({ as_of: "2026-11-10" }, december, false)
    ).toBe("2026-11-17");
    // 開会前の一覧で ※ が付いていても、提案は初日
    expect(
      provisionalSubmittedDate({ as_of: "2026-11-10" }, december, true)
    ).toBe("2026-11-17");
  });

  it("会議中に追加された議案（※）は、一覧の日付を提出日にする", () => {
    expect(
      provisionalSubmittedDate({ as_of: "2026-12-03" }, december, true)
    ).toBe("2026-12-03");
    // ※ の無い議案は初日のまま
    expect(
      provisionalSubmittedDate({ as_of: "2026-12-03" }, december, false)
    ).toBe("2026-11-17");
  });

  it("定例会議が分からなければ、一覧の日付", () => {
    expect(provisionalSubmittedDate({ as_of: "2026-11-10" }, null, false)).toBe(
      "2026-11-10"
    );
    expect(provisionalSubmittedDate({ as_of: null }, null, false)).toBeNull();
  });
});
