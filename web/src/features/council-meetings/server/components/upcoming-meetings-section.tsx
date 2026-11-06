import Link from "next/link";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import type { CouncilMeeting } from "../../shared/types";
import { MeetingList } from "./meeting-list";
import { ScheduleSourceNote } from "./schedule-source-note";

/** トップの「これからの会議」。直近の数件だけ出し、全体は /schedule へ。 */
export async function UpcomingMeetingsSection({
  meetings,
}: {
  meetings: CouncilMeeting[];
}) {
  if (meetings.length === 0) return null;
  const { council } = await getSiteSettings();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold leading-[1.48] text-black">
          これからの会議
        </h2>
        <p className="text-xs text-mirai-text-secondary">
          本会議と委員会の予定です。{council.name}
          が公表している日程をもとに、運営者が確認して載せています
        </p>
      </div>
      <MeetingList meetings={meetings} />
      <div className="flex flex-col items-end gap-2">
        <Link
          href={routes.schedule()}
          className="text-sm font-bold text-primary underline underline-offset-2"
        >
          会議の予定をすべて見る
        </Link>
        <ScheduleSourceNote sourceUrl={meetings[0].source_url} />
      </div>
    </section>
  );
}
