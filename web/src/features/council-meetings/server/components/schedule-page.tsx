import {
  councilWording,
  hasSessionSystemPage,
} from "@mirai-gikai/shared/site-settings/public";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { getJapanTime } from "@/lib/utils/date";
import { formatCouncilYear } from "../../shared/utils/council-period";
import {
  buildMonthGrid,
  gridRange,
  monthKeyOf,
  type YearMonth,
} from "../../shared/utils/month-calendar";
import { getPublishedMeetingsBetween } from "../loaders/get-council-meetings";
import { loadCouncilSchedule } from "../loaders/load-council-schedule";
import { MeetingList } from "./meeting-list";
import { MonthCalendar } from "./month-calendar";
import { PeriodList } from "./period-list";
import { ScheduleSourceNote } from "./schedule-source-note";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * 会議の予定（カレンダー）。定例会議の期間と開会までの日数、月のカレンダー、その月の会議。
 * 出すのは、運営者が議会の公表している日程で確認して公開した会議だけ。
 */
export async function SchedulePage({ month }: { month: YearMonth }) {
  const { council, links } = await getSiteSettings();
  const schedule = await loadCouncilSchedule(getJapanTime());
  const { status, periods, today } = schedule;
  const range = gridRange(buildMonthGrid(month));
  const meetings = await getPublishedMeetingsBetween(range.from, range.to);

  const monthFrom = `${month.year}-${pad2(month.month)}-01`;
  const monthTo = `${month.year}-${pad2(month.month)}-31`;
  const monthMeetings = meetings.filter(
    (m) =>
      m.meeting_date <= monthTo && (m.end_date ?? m.meeting_date) >= monthFrom
  );

  const wording = councilWording(council);
  const sessionLabel = wording.sessionLabel;
  const systemName = council.session_system_label || "通年議会";

  return (
    <Container className="pt-24 pb-12 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "会議の予定" },
          ]}
        />
      </div>

      <h1 className="mb-3 text-3xl font-bold">会議の予定</h1>
      <p className="mb-8 text-sm leading-6 text-mirai-text-secondary">
        {`${formatCouncilYear(status.councilYear)}の${council.name}の本会議・委員会の予定です。`}
        {council.session_model === "year_round"
          ? `${council.name}は${systemName}のため、会期は年度を通して続き、本会議は${sessionLabel}の期間に開かれます。`
          : `本会議は${sessionLabel}の期間に開かれます。`}
        {hasSessionSystemPage(council) && (
          <>
            {" "}
            <Link
              href={routes.councilSystem()}
              className="font-bold text-primary underline underline-offset-2"
            >
              {council.session_system_label}とは
            </Link>
          </>
        )}
      </p>

      {periods.length > 0 && (
        <section className="mb-10 flex flex-col gap-4">
          <h2 className="text-[22px] font-bold">
            {formatCouncilYear(status.councilYear)}の{sessionLabel}
          </h2>
          <PeriodList
            periods={periods}
            today={today}
            countdownOpenLabel={wording.countdownOpen}
            countdownCloseLabel={wording.countdownClose}
          />
        </section>
      )}

      {/*
        月を切り替えたら、カレンダーと一覧を作り直す（key）。
        ふりがな表示（Rubyful）は表の文字を差し替えるため、同じ要素を使い回して
        中身だけ更新すると、古い月の文字が残ったり描画エラーになったりする。
      */}
      <div key={monthKeyOf(month)} className="flex flex-col gap-10">
        <MonthCalendar
          month={month}
          today={today}
          meetings={meetings}
          periods={periods}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-bold">
            {month.month}月の会議
            <span className="ml-2 text-sm text-mirai-text-secondary">
              {monthMeetings.length}件
            </span>
          </h2>
          {monthMeetings.length > 0 ? (
            <MeetingList meetings={monthMeetings} withAnchors />
          ) : (
            <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm leading-6 text-mirai-text-secondary">
              この月の会議は、まだ載せていません。運営者が確認したものから順に載せます。
              <br />
              最新の日程は{council.name}の公式サイトでご確認ください。
              {links.schedule_page && (
                <>
                  <br />
                  <a
                    href={links.schedule_page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary underline underline-offset-2"
                  >
                    {council.name}の会議日程（公式サイト）
                  </a>
                </>
              )}
            </p>
          )}
          <div className="flex flex-col items-end gap-1">
            {monthMeetings.length > 0 && (
              <ScheduleSourceNote sourceUrl={monthMeetings[0].source_url} />
            )}
            <p className="text-right text-xs leading-5 text-mirai-text-secondary">
              載せているのは、運営者が{council.name}
              の公表している日程で確認した会議です（
              <Link
                href={routes.editorialPolicy()}
                className="underline underline-offset-2"
              >
                掲載方針
              </Link>
              ）。
            </p>
          </div>
        </section>
      </div>
    </Container>
  );
}
