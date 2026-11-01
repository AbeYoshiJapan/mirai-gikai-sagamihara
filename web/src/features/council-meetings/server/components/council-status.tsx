import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Progress } from "@/components/ui/progress";
import { calculateSessionProgress } from "@/features/diet-sessions/shared/utils/session-progress";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import type { CouncilMeeting, CouncilPeriod } from "../../shared/types";
import {
  daysBetween,
  formatCouncilYear,
  formatMeetingDateRange,
  formatShortDate,
  type CouncilStatus as Status,
} from "../../shared/utils/council-period";

type CouncilStatusProps = {
  status: Status;
  /** 今日開かれる会議（複数日の会議の途中日を含む）。 */
  todayMeetings: CouncilMeeting[];
  /** 明日以降で最初に会議が開かれる日の会議。 */
  nextMeetings: CouncilMeeting[];
  /** `YYYY-MM-DD`（日本時間） */
  today: string;
};

/**
 * 議会の状況カード。
 *
 * 通年議会なので「閉会中」は出さない。議会期間（○月議会）の中なら
 * 進行バーを、外なら次の議会期間までの日数を出す。その上に次に会議が開かれる日を
 * 大きく出す。今日の会議があれば並べる。
 */
export async function CouncilStatus({
  status,
  todayMeetings,
  nextMeetings,
  today,
}: CouncilStatusProps) {
  const { councilYear, currentPeriod, nextPeriod } = status;
  const { operator } = await getSiteSettings();

  // ヒーローを外したのでこのカードが最上部に来る。ヘッダーは fixed で
  // main-layout の上余白は md 以上にしか効かないため、モバイルでは
  // ここで余白を確保する（パンくずを持つページと同じ規約）。
  return (
    <Container className="pt-24 md:pt-5">
      <div className="flex flex-col gap-6 rounded-2xl bg-mirai-light-gradient px-5 py-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-mirai-brand-teal"
            aria-hidden
          />
          <span className="whitespace-nowrap text-xl font-bold">本日は</span>
          <span className="rounded-full bg-mirai-gradient px-3.5 py-1 text-[15px] font-bold text-mirai-text">
            {currentPeriod ? `${currentPeriod.name} 開催中` : "区議会 会期中"}
          </span>
          <span className="text-[15px] font-bold text-mirai-brand-teal-deep md:ml-auto">
            {formatCouncilYear(councilYear)}定例会（通年）
          </span>
        </div>

        {nextMeetings.length > 0 && <NextMeetingDay meetings={nextMeetings} />}

        {currentPeriod ? (
          <PeriodProgressBar period={currentPeriod} today={today} />
        ) : (
          nextPeriod && <NextPeriod period={nextPeriod} today={today} />
        )}

        {todayMeetings.length > 0 && (
          <div className="-mt-1 flex flex-col gap-1.5 rounded-xl bg-white/70 px-4 py-3">
            <span className="text-[13px] font-bold text-mirai-text-secondary">
              本日の会議
            </span>
            <ul className="flex flex-col gap-1">
              {todayMeetings.map((m) => (
                <li key={m.id} className="text-sm font-bold leading-6">
                  {m.name}
                  {m.start_time && (
                    <span className="ml-2 text-xs font-bold text-mirai-text-secondary">
                      {m.start_time}
                      {m.place && `・${m.place}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 pt-2">
        <Link
          href={routes.schedule()}
          className="text-xs font-bold text-primary underline underline-offset-2"
        >
          会議の予定を見る
        </Link>
        <p className="text-xs font-bold tracking-wide text-mirai-text-secondary">
          powered by {operator.name} &amp; AI
        </p>
      </div>
    </Container>
  );
}

function PeriodProgressBar({
  period,
  today,
}: {
  period: CouncilPeriod;
  today: string;
}) {
  const [y, m, d] = today.split("-").map(Number);
  const { percentage, daysLeft } = calculateSessionProgress(
    period,
    new Date(y, m - 1, d)
  );

  return (
    <div className="-mt-1.5 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-mirai-text-secondary">
          {period.name}の進行
        </span>
        <span className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-[13px] font-bold text-mirai-text-secondary">
            最終日まで
          </span>
          <span className="font-lexend text-[28px] font-bold leading-none text-primary-accent">
            {daysLeft}
          </span>
          <span className="text-[13px] font-bold text-primary-accent">日</span>
        </span>
      </div>
      <Progress
        value={percentage}
        aria-label={`${period.name}の進行`}
        className="h-2.5 bg-white/75 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary-accent [&>[data-slot=progress-indicator]]:to-mirai-gradient-start"
      />
      <div className="flex items-baseline justify-between gap-2 text-xs font-bold text-mirai-text-secondary">
        <span className="whitespace-nowrap">
          {formatShortDate(period.start_date)} 初日
        </span>
        <span className="whitespace-nowrap">
          {formatShortDate(period.end_date)} 最終日
        </span>
      </div>
    </div>
  );
}

function NextPeriod({
  period,
  today,
}: {
  period: CouncilPeriod;
  today: string;
}) {
  return (
    <div className="-mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15px] font-bold text-mirai-brand-teal-deep">
          次の本会議は{period.name}
        </span>
        <span className="whitespace-nowrap text-[13px] font-bold text-mirai-text-secondary">
          {formatShortDate(period.start_date)} -{" "}
          {formatShortDate(period.end_date)}
        </span>
      </span>
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[13px] font-bold text-mirai-text-secondary">
          初日まで
        </span>
        <span className="font-lexend text-[28px] font-bold leading-none text-primary-accent">
          {daysBetween(today, period.start_date)}
        </span>
        <span className="text-[13px] font-bold text-primary-accent">日</span>
      </span>
    </div>
  );
}

/** 次に会議が開かれる日。本会議・委員会を問わず、一番目立たせる。 */
function NextMeetingDay({ meetings }: { meetings: CouncilMeeting[] }) {
  const [first] = meetings;

  return (
    <div className="-mt-2 flex flex-col gap-1">
      <span className="text-[13px] font-bold text-mirai-text-secondary">
        次の開会日
      </span>
      <span className="text-[26px] font-bold leading-tight text-mirai-brand-teal-deep">
        {formatMeetingDateRange(first.meeting_date, first.end_date)}
      </span>
      <ul className="flex flex-col gap-0.5">
        {meetings.map((m) => (
          <li
            key={m.id}
            className="text-[15px] font-bold leading-6 text-mirai-brand-teal-deep"
          >
            {m.name}
            {m.start_time && (
              <span className="ml-2 text-xs font-bold text-mirai-text-secondary">
                {m.start_time}
                {m.place && `・${m.place}`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
