import {
  getBillDecisionLabel,
  isDecided,
} from "@mirai-gikai/shared/bill-stage/labels";
import {
  COUNCIL_QUESTION_KIND_LABELS,
  COUNCIL_QUESTION_KIND_ORDER,
} from "@mirai-gikai/shared/council-questions/types";
import {
  BILL_PAGE_ANCHORS,
  publicPaths,
  toPublicUrl,
} from "@mirai-gikai/shared/public-paths";
import type {
  PrBillSource,
  PrDraft,
  PrMeetingSource,
  PrOpinionsSource,
  PrPostLog,
  PrQuestionMeetingSource,
  PrQuestionSource,
  PrSourceType,
} from "../types";
import { countXWeight, truncateToXWeight, X_MAX_WEIGHT } from "./x-text";

export type PrDraftContext = {
  /** 公開サイトの URL（例: https://example.jp） */
  baseUrl: string;
  /** 下書きの最後に入れるハッシュタグ（空なら入れない） */
  hashtags: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 2026-11-17 → 11月17日 */
export function formatMonthDay(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}月${day}日`;
}

/** 2026-11-17 → 11月17日（火） */
export function formatMonthDayWithWeekday(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday =
    WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${formatMonthDay(dateKey)}（${weekday}）`;
}

/** 話題ごとの投稿の記録をまとめるときのキー */
export function prLogKey(sourceType: PrSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

/**
 * 行をつないで下書きにする。全体が X の上限を超えるときは、flexIndex の行だけを縮める。
 * 空の行は入れない。
 */
export function composeWithin(
  lines: (string | null | undefined)[],
  flexIndex: number
): string {
  const present = (list: (string | null | undefined)[]) =>
    list.filter((line): line is string => Boolean(line?.trim()));
  const full = present(lines).join("\n");
  if (countXWeight(full) <= X_MAX_WEIGHT) return full;

  const flex = lines[flexIndex];
  if (!flex) return full;
  const withoutFlex = present(
    lines.map((line, index) => (index === flexIndex ? "" : line))
  ).join("\n");
  // 縮める行のぶんの改行（1）を残しておく
  const budget = X_MAX_WEIGHT - countXWeight(withoutFlex) - 1;
  const shortened = truncateToXWeight(flex, Math.max(budget, 0));
  return present(
    lines.map((line, index) => (index === flexIndex ? shortened : line))
  ).join("\n");
}

function hashtagLine(ctx: PrDraftContext): string | null {
  return ctx.hashtags.trim() || null;
}

/** 議案：議決済みなら結果と日付を入れる。審議の途中のものは、状況を書かずに載せたことだけ伝える */
export function buildBillDraft(
  bill: PrBillSource,
  ctx: PrDraftContext
): PrDraft {
  const url = toPublicUrl(ctx.baseUrl, publicPaths.billDetail(bill.id));
  const decision = isDecided(bill) ? getBillDecisionLabel(bill) : null;
  const status = decision
    ? `${bill.decidedOn ? `${formatMonthDay(bill.decidedOn)}に` : ""}${decision}`
    : null;
  const detail = [bill.billNumber, status].filter(Boolean).join("・");

  return {
    sourceType: "bill",
    sourceId: bill.id,
    heading: bill.title,
    note: detail || null,
    url,
    text: composeWithin(
      [`【議案】${bill.title}`, detail, url, hashtagLine(ctx)],
      0
    ),
  };
}

/** 会議の予定 */
export function buildMeetingDraft(
  meeting: PrMeetingSource,
  ctx: PrDraftContext
): PrDraft {
  const url = toPublicUrl(ctx.baseUrl, publicPaths.schedule());
  const when = `${formatMonthDayWithWeekday(meeting.meetingDate)}${
    meeting.startTime ? ` ${meeting.startTime}から` : ""
  }`;
  const what = `${meeting.name}${meeting.place ? `（${meeting.place}）` : ""}`;

  return {
    sourceType: "meeting",
    sourceId: meeting.id,
    heading: `${formatMonthDayWithWeekday(meeting.meetingDate)} ${meeting.name}`,
    note: meeting.place,
    url,
    text: composeWithin(
      [`【会議の予定】${when}`, what, meeting.topic, url, hashtagLine(ctx)],
      2
    ),
  };
}

/** 定例会議ごとの議会での質問（通告の内容を載せたことと、一般質問の日程） */
export function buildCouncilQuestionsDraft(
  source: PrQuestionMeetingSource,
  ctx: PrDraftContext
): PrDraft {
  const url = toPublicUrl(
    ctx.baseUrl,
    publicPaths.councilQuestionMeeting(source.meetingKey)
  );
  const counts = COUNCIL_QUESTION_KIND_ORDER.filter(
    (kind) => source.counts[kind] > 0
  ).map(
    (kind) => `${COUNCIL_QUESTION_KIND_LABELS[kind]}${source.counts[kind]}人`
  );
  const first = source.generalDates[0];
  const last = source.generalDates[source.generalDates.length - 1];
  const schedule = first
    ? `一般質問の日程：${formatMonthDayWithWeekday(first)}${
        last && last !== first ? `〜${formatMonthDayWithWeekday(last)}` : ""
      }`
    : null;
  const summary = counts.length
    ? `${counts.join("・")}の通告の内容を載せました。`
    : null;

  return {
    sourceType: "council_questions",
    sourceId: source.meetingKey,
    heading: source.meetingName,
    note: counts.join("・") || null,
    url,
    text: composeWithin(
      [
        `【議会での質問】${source.meetingName}`,
        summary,
        schedule,
        url,
        hashtagLine(ctx),
      ],
      1
    ),
  };
}

/**
 * 議案ごとの公開中の意見。投稿者の文は引用しない
 * （サイトへの掲載には同意をもらっているが、X での引用までは同意をもらっていないため）。
 */
export function buildReaderOpinionsDraft(
  source: PrOpinionsSource,
  ctx: PrDraftContext
): PrDraft {
  const url = toPublicUrl(
    ctx.baseUrl,
    publicPaths.billDetail(source.billId),
    BILL_PAGE_ANCHORS.readerOpinions
  );
  return {
    sourceType: "reader_opinions",
    sourceId: source.billId,
    heading: source.billTitle,
    note: `公開中の意見 ${source.count}件`,
    url,
    text: composeWithin(
      [
        "【いただいた意見】",
        `「${source.billTitle}」に寄せられた意見を${source.count}件紹介しています。`,
        url,
        hashtagLine(ctx),
      ],
      1
    ),
  };
}

/** 公開中の質問と回答、意見と返事（送られた文は公開用の要約があればそれを使う） */
export function buildReaderQuestionDraft(
  source: PrQuestionSource,
  ctx: PrDraftContext
): PrDraft {
  const url = source.billId
    ? toPublicUrl(
        ctx.baseUrl,
        publicPaths.billDetail(source.billId),
        BILL_PAGE_ANCHORS.readerQuestions
      )
    : toPublicUrl(ctx.baseUrl, publicPaths.questions());
  const question = source.question.replace(/\s+/g, " ").trim();
  const isOpinion = source.kind === "opinion";

  return {
    sourceType: "reader_question",
    sourceId: source.id,
    heading: truncateToXWeight(question, 80),
    note: source.billTitle
      ? `議案：${source.billTitle}`
      : isOpinion
        ? "サイト全体への意見"
        : "サイト全体への質問",
    url,
    text: composeWithin(
      [
        isOpinion
          ? "【いただいた意見にお返事しました】"
          : "【いただいた質問に回答しました】",
        isOpinion ? `意見：${question}` : `Q. ${question}`,
        source.billTitle ? `（議案：${source.billTitle}）` : null,
        url,
        hashtagLine(ctx),
      ],
      1
    ),
  };
}

/** 投稿の記録を話題ごとにまとめる（並びは渡した順＝新しい順のまま） */
export function groupLogsByKey(logs: PrPostLog[]): Record<string, PrPostLog[]> {
  const grouped: Record<string, PrPostLog[]> = {};
  for (const log of logs) {
    const key = prLogKey(log.sourceType, log.sourceId);
    grouped[key] = [...(grouped[key] ?? []), log];
  }
  return grouped;
}
