import { CouncilMeetingsPage } from "@/features/council-meetings/server/components/council-meetings-page";
import { parseMeetingListView } from "@/features/council-meetings/shared/utils/meeting-views";

/** 公式サイトの取得（詳細ページを 1 件ずつ読む）に数十秒かかることがある */
export const maxDuration = 120;

export default async function CouncilMeetingsRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <CouncilMeetingsPage view={parseMeetingListView(params.view)} />;
}
