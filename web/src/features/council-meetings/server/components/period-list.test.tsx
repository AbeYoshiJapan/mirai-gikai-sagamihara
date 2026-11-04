// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodList } from "./period-list";

const periods = [
  { name: "6月定例会議", start_date: "2026-05-28", end_date: "2026-06-26" },
  { name: "9月定例会議", start_date: "2026-08-27", end_date: "2026-10-02" },
  { name: "12月定例会議", start_date: "2026-11-26", end_date: "2026-12-18" },
];

describe("PeriodList", () => {
  it("終わった期間・次の期間・その先の期間を区別し、開会までの日数を出す", () => {
    render(
      <PeriodList
        periods={periods}
        today="2026-11-05"
        countdownOpenLabel="開会まで"
        countdownCloseLabel="閉会まで"
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("6月定例会議");
    expect(items[0]).toHaveTextContent("終了");
    expect(items[1]).toHaveTextContent("終了");
    expect(items[2]).toHaveTextContent("12月定例会議");
    expect(items[2]).toHaveTextContent("11月26日（木） 〜 12月18日（金）");
    expect(items[2]).toHaveTextContent("開会まで 21 日");
  });

  it("開催中の期間は閉会までの日数を出す", () => {
    render(
      <PeriodList
        periods={periods}
        today="2026-12-01"
        countdownOpenLabel="開会まで"
        countdownCloseLabel="閉会まで"
      />
    );

    expect(screen.getAllByRole("listitem")[2]).toHaveTextContent(
      "開催中・閉会まで 17 日"
    );
  });

  it("期間がなければ何も出さない", () => {
    const { container } = render(
      <PeriodList
        periods={[]}
        today="2026-11-05"
        countdownOpenLabel="開会まで"
        countdownCloseLabel="閉会まで"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
