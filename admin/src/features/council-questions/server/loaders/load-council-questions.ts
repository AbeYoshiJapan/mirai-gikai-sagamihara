import "server-only";

import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import type {
  AdminCouncilQuestion,
  QuestionMeetingSummary,
  QuestionThemeLink,
  ThemeOption,
} from "../../shared/types";
import { resolveNoticePageUrl } from "../../shared/utils/notice-source";
import { meetingNameOf, parseMeetingKey } from "../../shared/utils/notice-text";
import {
  findQuestionById,
  findQuestionMeetingSummaries,
  findQuestionsByMeeting,
  findQuestionThemeLinks,
  findThemeOptions,
} from "../repositories/council-question-repository";

export async function loadCouncilQuestionsHome(): Promise<{
  meetings: QuestionMeetingSummary[];
  noticePageUrl: string | null;
  /** 公開サイトに「議会での質問」とテーマを出す設定か */
  featureEnabled: boolean;
  /** 「運営者」と添える、議会での氏名（空なら添えない） */
  nameInCouncil: string;
}> {
  const [{ settings }, meetings] = await Promise.all([
    loadSiteSettings(),
    findQuestionMeetingSummaries(),
  ]);
  return {
    meetings,
    noticePageUrl: resolveNoticePageUrl({
      billsPage: settings.links.bills_page,
      importSources: settings.import.sources,
    }),
    featureEnabled: settings.features.council_questions,
    nameInCouncil: settings.operator.name_in_council,
  };
}

export async function loadCouncilQuestionMeeting(meetingKey: string): Promise<{
  meetingName: string;
  questions: AdminCouncilQuestion[];
} | null> {
  const meeting = parseMeetingKey(meetingKey);
  if (!meeting) return null;
  const questions = await findQuestionsByMeeting(meetingKey);
  return {
    meetingName:
      questions[0]?.meeting_name ?? meetingNameOf(meeting.year, meeting.month),
    questions,
  };
}

export async function loadCouncilQuestionEdit(questionId: string): Promise<{
  question: AdminCouncilQuestion;
  themeOptions: ThemeOption[];
  themeLinks: QuestionThemeLink[];
} | null> {
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) return null;
  const question = await findQuestionById(questionId);
  if (!question) return null;
  const [themeOptions, themeLinks] = await Promise.all([
    findThemeOptions(),
    findQuestionThemeLinks(questionId),
  ]);
  return { question, themeOptions, themeLinks };
}
