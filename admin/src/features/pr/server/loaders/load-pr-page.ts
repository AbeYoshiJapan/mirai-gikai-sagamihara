import "server-only";

import { toJstDateKeyOf } from "@mirai-gikai/shared/bill-stage/deliberation-timing";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { env } from "@/lib/env";
import type { PrPageData } from "../../shared/types";
import {
  buildBillDraft,
  buildCouncilQuestionsDraft,
  buildMeetingDraft,
  buildReaderOpinionsDraft,
  buildReaderQuestionDraft,
  groupLogsByKey,
} from "../../shared/utils/pr-drafts";
import {
  findPublishedMeetingsBetween,
  findPublishedQuestionMeetings,
  findRecentPrPostLogs,
  findRecentPublishedBills,
  findRecentPublishedOpinionsByBill,
  findRecentPublishedQuestions,
} from "../repositories/pr-repository";

/** 会議の予定は、今日から何日先までを出すか */
const MEETING_DAYS_AHEAD = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 「PR・広報」の下書きを、公開中のものだけから作る（未公開・仮登録のものは使わない）。
 */
export async function loadPrPage(): Promise<PrPageData> {
  const now = Date.now();
  const today = toJstDateKeyOf(new Date(now).toISOString()) ?? "";
  const until =
    toJstDateKeyOf(new Date(now + MEETING_DAYS_AHEAD * DAY_MS).toISOString()) ??
    today;

  const [
    { settings },
    questionMeetings,
    meetings,
    bills,
    opinions,
    questions,
    logs,
  ] = await Promise.all([
    loadSiteSettings(),
    findPublishedQuestionMeetings(2),
    findPublishedMeetingsBetween(today, until),
    findRecentPublishedBills(10),
    findRecentPublishedOpinionsByBill(5),
    findRecentPublishedQuestions(5),
    findRecentPrPostLogs(300),
  ]);

  const baseUrl = (settings.site.canonical_url || env.webUrl).replace(
    /\/+$/,
    ""
  );
  const ctx = { baseUrl, hashtags: settings.site.x_hashtags };

  return {
    baseUrl,
    hashtags: settings.site.x_hashtags,
    logsReady: logs !== null,
    logsByKey: groupLogsByKey(logs ?? []),
    sections: [
      {
        key: "council-questions",
        title: "議会での質問",
        description:
          "公開中の代表質問・個人質疑・一般質問を、定例会議ごとに紹介します。",
        emptyText: "公開中の議会での質問はまだありません。",
        drafts: questionMeetings.map((m) => buildCouncilQuestionsDraft(m, ctx)),
      },
      {
        key: "meetings",
        title: `会議の予定（これから${MEETING_DAYS_AHEAD}日）`,
        description: "公開中の会議の予定です。",
        emptyText: `これから${MEETING_DAYS_AHEAD}日の公開中の会議の予定はありません。`,
        drafts: meetings.map((m) => buildMeetingDraft(m, ctx)),
      },
      {
        key: "bills",
        title: "議案（最近の更新）",
        description:
          "公開中の議案を、更新の新しい順に出します。議決済みのものは、結果と日付が入ります。",
        emptyText: "公開中の議案はありません。",
        drafts: bills.map((b) => buildBillDraft(b, ctx)),
      },
      {
        key: "reader-posts",
        title: "皆さんとのやりとり",
        description:
          "公開中の意見（議案ごと）と、回答した質問・返事をした意見です。議案への意見は、投稿した方の文を X では引用しない下書きにしています。",
        emptyText: "公開中の意見・質問はまだありません。",
        drafts: [
          ...opinions.map((o) => buildReaderOpinionsDraft(o, ctx)),
          ...questions.map((q) => buildReaderQuestionDraft(q, ctx)),
        ],
      },
    ],
  };
}
