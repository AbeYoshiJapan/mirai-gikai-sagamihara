import "server-only";

import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import type { AdminCouncilMeeting, CommitteeOption } from "../../shared/types";
import { resolveCalendarMonthTemplate } from "../../shared/utils/calendar-source";
import { needsReview } from "../../shared/utils/meeting-review-state";
import { jstDateKey } from "../../shared/utils/meeting-rows";
import {
  type MeetingListView,
  meetingListRange,
  selectMeetingsForView,
} from "../../shared/utils/meeting-views";
import {
  type CalendarRunView,
  findCommitteeOptions,
  findLatestCalendarRun,
  findMeetingById,
  findMeetingsForAdmin,
} from "../repositories/council-meeting-repository";

export async function loadCouncilMeetingsPage(view: MeetingListView): Promise<{
  meetings: AdminCouncilMeeting[];
  reviewCount: number;
  latestRun: CalendarRunView;
  calendarSource: string | null;
  autoFetch: boolean;
}> {
  const today = jstDateKey();
  const [{ settings }, viewMeetings, reviewMeetings, latestRun] =
    await Promise.all([
      loadSiteSettings(),
      findMeetingsForAdmin(meetingListRange(view, today)),
      view === "review"
        ? Promise.resolve(null)
        : findMeetingsForAdmin(meetingListRange("review", today)),
      findLatestCalendarRun(),
    ]);
  const reviewSource = reviewMeetings ?? viewMeetings;

  return {
    meetings: selectMeetingsForView(viewMeetings, view),
    reviewCount: reviewSource.filter(needsReview).length,
    latestRun,
    calendarSource: resolveCalendarMonthTemplate({
      calendarMonthUrl: settings.import.calendar_month_url,
      councilSite: settings.links.council_site,
    }),
    autoFetch: settings.import.calendar_auto_fetch,
  };
}

export async function loadCouncilMeetingForm(id: string | null): Promise<{
  meeting: AdminCouncilMeeting | null;
  committees: CommitteeOption[];
}> {
  const [meeting, committees] = await Promise.all([
    id ? findMeetingById(id) : Promise.resolve(null),
    findCommitteeOptions(),
  ]);
  return { meeting, committees };
}
