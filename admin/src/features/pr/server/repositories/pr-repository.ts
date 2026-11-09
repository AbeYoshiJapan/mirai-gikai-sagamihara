import "server-only";

import type {
  BillKind,
  BillResult,
  BillStage,
  VoteOutcome,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { CouncilQuestionKind } from "@mirai-gikai/shared/council-questions/types";
import {
  getPublicQuestionText,
  toReaderQuestionKind,
} from "@mirai-gikai/shared/reader-posts/labels";
import { createAdminClient } from "@mirai-gikai/supabase";
import { isMissingSchemaError } from "@/lib/utils/missing-schema-error";
import {
  PR_SOURCE_TYPES,
  type PrBillSource,
  type PrMeetingSource,
  type PrOpinionsSource,
  type PrPostLog,
  type PrQuestionMeetingSource,
  type PrQuestionSource,
  type PrSourceType,
} from "../../shared/types";

type BillContentRow = { title: string | null; difficulty_level: string };

/** 公開用の議案の題名（やさしい解説の題名 → 正式な名前） */
function pickBillTitle(name: string, contents: BillContentRow[] | null) {
  const normal = contents?.find((c) => c.difficulty_level === "normal")?.title;
  const any = contents?.find((c) => c.title?.trim())?.title;
  return (normal || any || name).trim();
}

/** 公開中の議案。更新の新しい順 */
export async function findRecentPublishedBills(
  limit: number
): Promise<PrBillSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "id, name, bill_number, bill_kind, stage, result, vote_outcome, decided_on, updated_at, bill_contents(title, difficulty_level)"
    )
    .eq("publish_status", "published")
    .eq("is_review_completed", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`議案の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: pickBillTitle(row.name, row.bill_contents as BillContentRow[]),
    billNumber: row.bill_number,
    bill_kind: row.bill_kind as BillKind,
    stage: row.stage as BillStage | null,
    result: row.result as BillResult | null,
    vote_outcome: row.vote_outcome as VoteOutcome | null,
    decidedOn: row.decided_on,
    updatedAt: row.updated_at,
  }));
}

/** 公開中の会議の予定（from〜to の日付、日付の順） */
export async function findPublishedMeetingsBetween(
  from: string,
  to: string
): Promise<PrMeetingSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_meetings")
    .select("id, name, meeting_date, start_time, place, topic")
    .eq("is_published", true)
    .gte("meeting_date", from)
    .lte("meeting_date", to)
    .order("meeting_date", { ascending: true })
    .limit(30);
  if (error)
    throw new Error(`会議の予定の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    meetingDate: row.meeting_date,
    startTime: row.start_time,
    place: row.place,
    topic: row.topic,
  }));
}

/**
 * 公開中の議会での質問を、定例会議ごとにまとめる（新しい定例会議から）。
 * DB の更新前で表が無ければ空。
 */
export async function findPublishedQuestionMeetings(
  limit: number
): Promise<PrQuestionMeetingSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select("meeting_key, meeting_name, kind, question_date")
    .eq("is_published", true);
  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw new Error(`議会での質問の取得に失敗しました: ${error.message}`);
  }

  const byKey = new Map<
    string,
    PrQuestionMeetingSource & { dates: Set<string> }
  >();
  for (const row of data ?? []) {
    const entry = byKey.get(row.meeting_key) ?? {
      meetingKey: row.meeting_key,
      meetingName: row.meeting_name,
      counts: { representative: 0, individual: 0, general: 0 },
      generalDates: [],
      dates: new Set<string>(),
    };
    entry.counts[row.kind as CouncilQuestionKind] += 1;
    if (row.kind === "general" && row.question_date) {
      entry.dates.add(row.question_date);
    }
    byKey.set(row.meeting_key, entry);
  }
  return [...byKey.values()]
    .sort((a, b) => b.meetingKey.localeCompare(a.meetingKey))
    .slice(0, limit)
    .map(({ dates, ...entry }) => ({
      ...entry,
      generalDates: [...dates].sort(),
    }));
}

type BillRef = {
  name: string;
  bill_contents: BillContentRow[] | null;
} | null;

/** 公開中の意見を議案ごとにまとめる（最近公開した意見のある議案から） */
export async function findRecentPublishedOpinionsByBill(
  limit: number
): Promise<PrOpinionsSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_opinions")
    .select(
      "bill_id, published_at, bills(name, bill_contents(title, difficulty_level))"
    )
    .eq("status", "published")
    .eq("consent_to_publish", true)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`意見の取得に失敗しました: ${error.message}`);

  const byBill = new Map<string, PrOpinionsSource>();
  for (const row of data ?? []) {
    const bill = row.bills as unknown as BillRef;
    const entry = byBill.get(row.bill_id) ?? {
      billId: row.bill_id,
      billTitle: bill ? pickBillTitle(bill.name, bill.bill_contents) : "議案",
      count: 0,
      latestPublishedAt: row.published_at,
    };
    entry.count += 1;
    byBill.set(row.bill_id, entry);
  }
  return [...byBill.values()].slice(0, limit);
}

/** 公開中の質問と回答。公開の新しい順 */
export async function findRecentPublishedQuestions(
  limit: number
): Promise<PrQuestionSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reader_questions")
    .select(
      "id, kind, bill_id, body, question_summary, published_at, bills(name, bill_contents(title, difficulty_level))"
    )
    .eq("status", "published")
    .eq("consent_to_publish", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`質問の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((row) => {
    const bill = row.bills as unknown as BillRef;
    return {
      id: row.id,
      kind: toReaderQuestionKind(row.kind),
      billId: row.bill_id,
      billTitle: bill ? pickBillTitle(bill.name, bill.bill_contents) : null,
      question: getPublicQuestionText(row),
      publishedAt: row.published_at,
    };
  });
}

function isPrSourceType(value: string): value is PrSourceType {
  return (PR_SOURCE_TYPES as readonly string[]).includes(value);
}

/** 投稿の記録（新しい順）。DB の更新前で表が無ければ null */
export async function findRecentPrPostLogs(
  limit: number
): Promise<PrPostLog[] | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pr_post_logs")
    .select("id, source_type, source_id, body, posted_at")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw new Error(`投稿の記録の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).flatMap((row) =>
    isPrSourceType(row.source_type)
      ? [
          {
            id: row.id,
            sourceType: row.source_type,
            sourceId: row.source_id,
            body: row.body,
            postedAt: row.posted_at,
          },
        ]
      : []
  );
}

export async function insertPrPostLog(input: {
  sourceType: PrSourceType;
  sourceId: string;
  body: string;
  /** 記録した管理者（消された管理者の記録は null になる） */
  postedBy: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("pr_post_logs").insert({
    source_type: input.sourceType,
    source_id: input.sourceId,
    body: input.body,
    posted_by: input.postedBy,
  });
  if (error) {
    if (isMissingSchemaError(error)) {
      throw new Error(
        "投稿の記録には DB の更新が必要です（npx supabase db push --remote を実行してください）"
      );
    }
    throw new Error(`投稿の記録に失敗しました: ${error.message}`);
  }
}

export async function deletePrPostLog(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("pr_post_logs").delete().eq("id", id);
  if (error)
    throw new Error(`投稿の記録の削除に失敗しました: ${error.message}`);
}
