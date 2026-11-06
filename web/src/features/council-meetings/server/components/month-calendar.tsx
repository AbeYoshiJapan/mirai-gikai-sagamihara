import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { CouncilMeeting, CouncilPeriod } from "../../shared/types";
import {
  buildMonthGrid,
  calendarCellLabel,
  meetingsByDate,
  monthKeyOf,
  periodOnDate,
  shiftYearMonth,
  type YearMonth,
} from "../../shared/utils/month-calendar";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
/** マスに出す会議の数（それより多ければ「+n」） */
const MAX_CHIPS = 3;

const CHIP_STYLES: Record<CouncilMeeting["category"], string> = {
  plenary: "bg-primary text-white",
  standing: "border border-primary bg-white text-primary",
  special: "bg-mirai-info-blue text-mirai-text",
  steering: "bg-mirai-surface-muted text-mirai-text-secondary",
  other: "bg-mirai-surface-muted text-mirai-text-secondary",
};

function monthHref(month: YearMonth): Route {
  return `${routes.schedule()}?month=${monthKeyOf(month)}` as Route;
}

function dayColor(weekday: number): string {
  if (weekday === 0) return "text-mirai-calendar-sunday";
  if (weekday === 6) return "text-mirai-calendar-saturday";
  return "text-mirai-text";
}

/**
 * 会議の月のカレンダー。運営者が確認して公開した会議だけを出す。
 * マスの会議を押すと、下の「この月の会議」のその日に移る。
 */
export function MonthCalendar({
  month,
  today,
  meetings,
  periods,
}: {
  month: YearMonth;
  today: string;
  meetings: CouncilMeeting[];
  periods: CouncilPeriod[];
}) {
  const weeks = buildMonthGrid(month);
  const byDate = meetingsByDate(meetings);
  const prev = shiftYearMonth(month, -1);
  const next = shiftYearMonth(month, 1);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const isThisMonth = month.year === todayYear && month.month === todayMonth;

  return (
    <section className="flex flex-col gap-3" aria-label="会議のカレンダー">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={monthHref(prev)}
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-primary hover:bg-white"
        >
          <ChevronLeft className="size-4" />
          {prev.month}月
        </Link>
        <div className="flex flex-col items-center">
          <h2 className="text-[22px] font-bold leading-tight">
            {month.year}年{month.month}月
          </h2>
          {!isThisMonth && (
            <Link
              href={routes.schedule()}
              className="text-xs font-bold text-primary underline underline-offset-2"
            >
              今月に戻る
            </Link>
          )}
        </div>
        <Link
          href={monthHref(next)}
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-primary hover:bg-white"
        >
          {next.month}月
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label, weekday) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    "py-2 text-center text-xs font-bold",
                    dayColor(weekday)
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].date}>
                {week.map((day) => {
                  const dayMeetings = byDate.get(day.date) ?? [];
                  const period = periodOnDate(day.date, periods);
                  const isToday = day.date === today;
                  return (
                    <td
                      key={day.date}
                      className={cn(
                        "h-20 border-t border-mirai-surface-muted p-0.5 align-top md:h-24 md:p-1",
                        period && "bg-mirai-brand-mint",
                        !day.inMonth && "opacity-40"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={cn(
                            "mx-auto flex size-6 items-center justify-center rounded-full text-xs font-bold md:mx-0",
                            dayColor(day.weekday),
                            isToday && "bg-primary text-white"
                          )}
                        >
                          {day.day}
                          {isToday && (
                            <span className="sr-only">日（今日）</span>
                          )}
                        </span>
                        {dayMeetings.slice(0, MAX_CHIPS).map((meeting) => (
                          <a
                            key={meeting.id}
                            href={`#d-${meeting.meeting_date}`}
                            title={meeting.name}
                            className={cn(
                              "block truncate rounded px-0.5 text-center text-[10px] font-bold leading-4 md:px-1 md:text-left md:text-[11px]",
                              CHIP_STYLES[meeting.category]
                            )}
                          >
                            {calendarCellLabel(meeting)}
                          </a>
                        ))}
                        {dayMeetings.length > MAX_CHIPS && (
                          <a
                            href={`#d-${day.date}`}
                            className="text-center text-[10px] font-bold text-mirai-text-secondary"
                          >
                            +{dayMeetings.length - MAX_CHIPS}
                          </a>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mirai-text-secondary">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-primary" />
          本会議
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded border border-primary bg-white" />
          常任委員会
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-mirai-info-blue" />
          特別委員会
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-mirai-surface-muted" />
          議会運営委員会など
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-3 rounded border border-mirai-surface-muted bg-mirai-brand-mint" />
          定例会議の期間
        </span>
      </div>
    </section>
  );
}
