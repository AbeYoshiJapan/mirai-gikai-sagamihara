import "server-only";

import {
  planSiteImport,
  type SiteMeetingCandidate,
} from "@mirai-gikai/shared/council-meetings/plan-site-import";
import { resolveMeetingLabel } from "@mirai-gikai/shared/council-meetings/resolve-meeting-label";
import {
  buildCalendarMonthUrl,
  calendarMonthsFrom,
  calendarRangeOf,
  describeCalendarHtml,
  groupCalendarEntries,
  parseSiteCalendarHtml,
  type SiteCalendarEntry,
} from "@mirai-gikai/shared/council-meetings/site-calendar";
import {
  parseSiteMeetingDetailHtml,
  type SiteMeetingDetail,
} from "@mirai-gikai/shared/council-meetings/site-meeting-detail";
import {
  createImportRun,
  finishImportRun,
} from "@/features/import/server/repositories/import-repository";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import type { SiteCalendarImportResult } from "../../shared/types";
import { resolveCalendarMonthTemplate } from "../../shared/utils/calendar-source";
import {
  toSiteInsertRow,
  toSnapshotColumns,
} from "../../shared/utils/meeting-rows";
import {
  findCommitteesForMeetings,
  findSiteMeetingsForImport,
  insertSiteMeetings,
  toJson,
  updateMeeting,
} from "../repositories/council-meeting-repository";
import { fetchSitePage } from "../utils/fetch-site-text";

export type FetchText = (url: string) => Promise<string>;

/** 議会サイトに負担をかけないよう、1 件ずつ間を空ける */
const PAGE_INTERVAL_MS = 1000;
const DETAIL_INTERVAL_MS = 400;
/** 1 回の取得で読む詳細ページの上限 */
const MAX_DETAIL_PAGES = 80;

async function defaultFetchText(url: string): Promise<string> {
  return (await fetchSitePage(url)).text;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 議会サイトのカレンダーから、今月から 3 か月分の会議を読み、会議予定に仮登録する。
 *
 * 仮登録は公開サイトに出ない。運営者が管理画面「会議予定」で確認して公開する。
 * 確認済みの会議は書き換えず、公式サイトの変更は「変更あり」として残す（planSiteImport）。
 * カレンダーから 1 件も読めなかったときは、何も変えずに失敗として記録する。
 */
export async function importSiteCalendar(params: {
  triggeredBy: string | null;
  /** 日本時間の今日（YYYY-MM-DD） */
  today: string;
  fetchText?: FetchText;
  wait?: (ms: number) => Promise<void>;
}): Promise<SiteCalendarImportResult> {
  const fetchText = params.fetchText ?? defaultFetchText;
  const wait = params.wait ?? sleep;
  const { settings } = await loadSiteSettings();
  const empty = {
    added: 0,
    refreshed: 0,
    changed: 0,
    removed: 0,
    unchanged: 0,
  };

  const template = resolveCalendarMonthTemplate({
    calendarMonthUrl: settings.import.calendar_month_url,
    councilSite: settings.links.council_site,
  });
  if (!template) {
    return {
      ok: false,
      months: [],
      ...empty,
      warnings: [],
      error:
        "取得元のカレンダーの URL がありません。「サイト設定」→「取込」か「リンク」の議会の公式サイトを入れてください",
    };
  }

  const months = calendarMonthsFrom(params.today, 3);
  const monthUrls = months.map((m) =>
    buildCalendarMonthUrl(template, m.year, m.month)
  );
  const runId = await createImportRun({
    sourceId: "council-calendar",
    adapter: "site_calendar",
    dryRun: false,
    triggeredBy: params.triggeredBy,
  });
  const log: string[] = [];
  const warnings: string[] = [];

  try {
    const entries: SiteCalendarEntry[] = [];
    for (const [index, url] of monthUrls.entries()) {
      if (index > 0) await wait(PAGE_INTERVAL_MS);
      try {
        const html = await fetchText(url);
        const found = parseSiteCalendarHtml(html, {
          ...months[index],
          baseUrl: url,
        });
        log.push(`${url}: ${found.length} 件`);
        if (found.length === 0) {
          // 原因を調べられるよう、ページの様子を残す
          warnings.push(
            `${url} から会議を読めませんでした（${describeCalendarHtml(html)}）`
          );
        }
        entries.push(...found);
      } catch (error) {
        warnings.push(`${url} を読めませんでした（${String(error)}）`);
      }
    }

    if (entries.length === 0) {
      const message =
        "カレンダーから会議を 1 件も読めませんでした。議会サイトの形が変わった可能性があります（何も変更していません）";
      await finishImportRun({
        id: runId,
        status: "failed",
        summary: {},
        log: [...log, ...warnings, message].join("\n"),
      });
      return {
        ok: false,
        months: monthUrls,
        ...empty,
        warnings,
        error: message,
      };
    }

    const groups = groupCalendarEntries(entries);
    const committees = await findCommitteesForMeetings();
    const candidates: SiteMeetingCandidate[] = [];
    let unrecognized = 0;

    for (const [index, group] of groups.entries()) {
      let detail: SiteMeetingDetail | null = null;
      if (index < MAX_DETAIL_PAGES) {
        if (index > 0) await wait(DETAIL_INTERVAL_MS);
        try {
          detail = parseSiteMeetingDetailHtml(await fetchText(group.url));
        } catch (error) {
          warnings.push(
            `${group.label}（${group.date}）の詳細を読めませんでした`
          );
          log.push(`${group.url}: ${String(error)}`);
        }
      }
      const resolved = resolveMeetingLabel(
        group.label,
        committees,
        detail?.title
      );
      if (!resolved.recognized) unrecognized += 1;
      candidates.push({
        source_url: group.url,
        meeting_date: group.date,
        end_date: group.endDate,
        site_label: group.label,
        name: resolved.name,
        category: resolved.category,
        committee_id: resolved.committeeId,
        start_time: detail?.startTime ?? null,
        place: detail?.place ?? null,
        recognized: resolved.recognized,
      });
    }
    if (unrecognized > 0) {
      warnings.push(
        `会議名を決められなかった略称が ${unrecognized} 件あります（区分「その他」で仮登録。確認のときに直してください）`
      );
    }

    const range = calendarRangeOf(months);
    const now = new Date().toISOString();
    const existing = await findSiteMeetingsForImport({
      ...range,
      urls: candidates.map((c) => c.source_url),
    });
    const plan = planSiteImport({ candidates, existing, range, now });
    const yearStartMonth = settings.council.year_start_month;

    await insertSiteMeetings(
      plan.inserts.map((c) =>
        toSiteInsertRow(c, { yearStartMonth, fetchedAt: now })
      )
    );
    for (const update of plan.updates) {
      await updateMeeting(update.id, {
        ...(update.fields && toSnapshotColumns(update.fields, yearStartMonth)),
        site_snapshot: toJson(update.site_snapshot),
        ...(update.pending_update !== undefined && {
          pending_update: toJson(update.pending_update),
        }),
        fetched_at: now,
      });
    }

    await finishImportRun({
      id: runId,
      status: "succeeded",
      summary: plan.summary,
      log: [...log, ...warnings].join("\n"),
    });
    return { ok: true, months: monthUrls, ...plan.summary, warnings };
  } catch (error) {
    const message = `取得の途中で失敗しました: ${String(error)}`;
    await finishImportRun({
      id: runId,
      status: "failed",
      summary: {},
      log: [...log, ...warnings, message].join("\n"),
    });
    return { ok: false, months: monthUrls, ...empty, warnings, error: message };
  }
}
