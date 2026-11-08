import {
  type CouncilWording,
  councilWording,
  hasSessionSystemPage,
} from "@mirai-gikai/shared/site-settings/public";
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
 * 通年議会（相模原市議会）では会期が年度を通して続き、その中の定例会議を単位に運営する。
 * 定例会議の期間中なら進行バーと「閉会まで○日」、外なら次の定例会議と「開会まで○日」を出す。
 * 右上には制度の名前（通年議会）を出し、説明ページへ案内する。
 * 定例会制の議会でも同じ部品で「閉会中」「次の定例会 開会まで○日」と出せる。
 * 文言はすべてサイト設定（議会タブ）で変えられる。
 */
export async function CouncilStatus({
  status,
  todayMeetings,
  nextMeetings,
  today,
}: CouncilStatusProps) {
  const { councilYear, currentPeriod, nextPeriod } = status;
  const { council } = await getSiteSettings();
  // 文言はサイト設定（議会タブ）から。空なら会期の方式から自動で決まる
  const wording = councilWording(council);
  const showSystem = hasSessionSystemPage(council);

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
            {currentPeriod
              ? `${currentPeriod.name} 開催中`
              : wording.outOfPeriod}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold text-mirai-brand-teal-deep md:ml-auto">
            <span>{formatCouncilYear(councilYear)}</span>
            {showSystem && (
              <Link
                href={routes.councilSystem()}
                title={council.session_system_summary || undefined}
                className="rounded-full border border-current px-2.5 py-0.5 text-xs underline-offset-2 hover:underline"
              >
                {council.session_system_label}
                <span className="sr-only">とは</span>
              </Link>
            )}
          </span>
        </div>

        {nextMeetings.length > 0 && <NextMeetingDay meetings={nextMeetings} />}

        {currentPeriod ? (
          <PeriodProgressBar
            period={currentPeriod}
            today={today}
            wording={wording}
          />
        ) : (
          nextPeriod && (
            <NextPeriod period={nextPeriod} today={today} wording={wording} />
          )
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
      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={routes.schedule()}
            className="text-xs font-bold text-primary underline underline-offset-2"
          >
            会議の予定を見る
          </Link>
          {showSystem && (
            <Link
              href={routes.councilSystem()}
              className="text-xs font-bold text-primary underline underline-offset-2"
            >
              {council.session_system_label}とは
            </Link>
          )}
        </span>
        <p className="text-xs font-bold tracking-wide text-mirai-text-secondary">
          運営者が確認した情報だけを載せています（
          <Link
            href={routes.editorialPolicy()}
            className="underline underline-offset-2 hover:opacity-80"
          >
            掲載方針
          </Link>
          ）
        </p>
      </div>
    </Container>
  );
}

function PeriodProgressBar({
  period,
  today,
  wording,
}: {
  period: CouncilPeriod;
  today: string;
  wording: CouncilWording;
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
            {wording.countdownClose}
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
          {formatShortDate(period.start_date)} 開会
        </span>
        <span className="whitespace-nowrap">
          {formatShortDate(period.end_date)} 閉会
        </span>
      </div>
    </div>
  );
}

/** 次の議会期間（例: 12月定例会議 開会まで 21 日）。 */
function NextPeriod({
  period,
  today,
  wording,
}: {
  period: CouncilPeriod;
  today: string;
  wording: CouncilWording;
}) {
  return (
    <div className="-mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold text-mirai-text-secondary">
          次の{wording.sessionLabel}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[22px] font-bold leading-tight text-mirai-brand-teal-deep">
            {period.name}
          </span>
          <span className="whitespace-nowrap text-[13px] font-bold text-mirai-text-secondary">
            {formatShortDate(period.start_date)} -{" "}
            {formatShortDate(period.end_date)}
          </span>
        </span>
      </span>
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <span className="text-[13px] font-bold text-mirai-text-secondary">
          {wording.countdownOpen}
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
        次に開かれる会議
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
