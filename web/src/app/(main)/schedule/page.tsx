import type { Metadata } from "next";
import { SchedulePage } from "@/features/council-meetings/server/components/schedule-page";
import { toDateKey } from "@/features/council-meetings/shared/utils/council-period";
import { parseMonthParam } from "@/features/council-meetings/shared/utils/month-calendar";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";
import { getJapanTime } from "@/lib/utils/date";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  return {
    title: `会議の予定（カレンダー） | ${site.name}`,
    description: `${council.name}の本会議・常任委員会・特別委員会・議会運営委員会の予定をカレンダーで見られます。`,
  };
}

export default async function ScheduleRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireFeature("schedule");
  const params = await searchParams;
  const month = parseMonthParam(params.month, toDateKey(getJapanTime()));
  return <SchedulePage month={month} />;
}
