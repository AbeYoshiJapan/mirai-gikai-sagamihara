import type { CouncilPeriod } from "../../shared/types";
import {
  daysBetween,
  formatMeetingDate,
} from "../../shared/utils/council-period";

type PeriodListProps = {
  periods: CouncilPeriod[];
  /** `YYYY-MM-DD`（日本時間） */
  today: string;
  /** 例: 開会まで */
  countdownOpenLabel: string;
  /** 例: 閉会まで */
  countdownCloseLabel: string;
};

type PeriodState = "past" | "current" | "upcoming";

function stateOf(period: CouncilPeriod, today: string): PeriodState {
  if (period.end_date < today) return "past";
  if (period.start_date > today) return "upcoming";
  return "current";
}

/**
 * 議会年度の議会期間（定例会議など）の一覧。開催中・次の期間を目立たせ、
 * 「開会まで○日」「閉会まで○日」を添える。
 */
export function PeriodList({
  periods,
  today,
  countdownOpenLabel,
  countdownCloseLabel,
}: PeriodListProps) {
  if (periods.length === 0) return null;
  const nextIndex = periods.findIndex((p) => p.start_date > today);

  return (
    <ol className="flex flex-col gap-2">
      {periods.map((period, index) => {
        const state = stateOf(period, today);
        const isNext = index === nextIndex;
        const highlighted = state === "current" || isNext;
        return (
          <li
            key={`${period.name}-${period.start_date}`}
            className={
              highlighted
                ? "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl bg-mirai-light-gradient px-4 py-3"
                : "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 text-mirai-text-secondary"
            }
          >
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span
                className={
                  highlighted
                    ? "text-[17px] font-bold text-mirai-brand-teal-deep"
                    : "text-[15px] font-bold"
                }
              >
                {period.name}
              </span>
              <span className="text-[13px] font-bold">
                {formatMeetingDate(period.start_date)} 〜{" "}
                {formatMeetingDate(period.end_date)}
              </span>
            </span>
            <span className="text-[13px] font-bold">
              {state === "past" && "終了"}
              {state === "current" && (
                <>
                  開催中・{countdownCloseLabel}{" "}
                  <span className="font-lexend text-lg text-primary-accent">
                    {daysBetween(today, period.end_date)}
                  </span>{" "}
                  日
                </>
              )}
              {state === "upcoming" && (
                <>
                  {countdownOpenLabel}{" "}
                  <span
                    className={
                      isNext
                        ? "font-lexend text-lg text-primary-accent"
                        : "font-lexend"
                    }
                  >
                    {daysBetween(today, period.start_date)}
                  </span>{" "}
                  日
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
