import "server-only";
import {
  type CouncilQuestionKind,
  readNoticeItems,
} from "@mirai-gikai/shared/council-questions/types";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  LinkedBill,
  PublicCouncilQuestion,
  PublicQuestionMeeting,
  PublicTheme,
  PublicThemeSummary,
  ThemeBill,
  ThemeQuestionItem,
} from "../../shared/types";

/**
 * 議会での質問とテーマ。公開サイトには、運営者が確認して公開したもの（is_published）と、
 * テーマとして公開したタグ（is_theme）だけを出す。
 * テーブルがまだ無い（DB の更新前）ときは、空として扱う。
 */

const QUESTION_SELECT =
  "id, meeting_key, meeting_name, kind, order_no, seat_number, member_name, faction_label, method, question_date, items, bill_refs, source_url, stream_url, minutes_url, confirmed_at";

type QuestionRow = Omit<PublicCouncilQuestion, "kind" | "items"> & {
  kind: string;
  items: unknown;
};

function toQuestion(row: QuestionRow): PublicCouncilQuestion {
  return {
    ...row,
    kind: row.kind as CouncilQuestionKind,
    items: readNoticeItems(row.items),
  };
}

export async function findPublishedQuestionMeetings(): Promise<
  PublicQuestionMeeting[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select("meeting_key, meeting_name")
    .eq("is_published", true);
  if (error) {
    console.error("Failed to fetch council question meetings:", error);
    return [];
  }
  const byKey = new Map<string, PublicQuestionMeeting>();
  for (const row of data ?? []) {
    const meeting = byKey.get(row.meeting_key) ?? {
      meeting_key: row.meeting_key,
      meeting_name: row.meeting_name,
      count: 0,
    };
    meeting.count++;
    byKey.set(row.meeting_key, meeting);
  }
  return [...byKey.values()].sort((a, b) =>
    b.meeting_key.localeCompare(a.meeting_key)
  );
}

export async function findPublishedQuestionsByMeeting(
  meetingKey: string
): Promise<PublicCouncilQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(QUESTION_SELECT)
    .eq("meeting_key", meetingKey)
    .eq("is_published", true)
    .order("order_no", { ascending: true });
  if (error) {
    console.error("Failed to fetch council questions:", error);
    return [];
  }
  return (data ?? []).map((row) => toQuestion(row as QuestionRow));
}

export async function findPublishedQuestionById(
  id: string
): Promise<PublicCouncilQuestion | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(QUESTION_SELECT)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch council question:", error);
    return null;
  }
  return data ? toQuestion(data as QuestionRow) : null;
}

export async function findPublishedQuestionsByMember(
  memberName: string
): Promise<PublicCouncilQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(QUESTION_SELECT)
    .eq("member_name", memberName)
    .eq("is_published", true)
    .order("meeting_key", { ascending: false })
    .order("order_no", { ascending: true });
  if (error) {
    console.error("Failed to fetch member questions:", error);
    return [];
  }
  return (data ?? []).map((row) => toQuestion(row as QuestionRow));
}

/** 議案の番号（例: 議案第99号）が通告に出てくる、その年の公開中の質問 */
export async function findPublishedQuestionsByBillRef(
  year: number,
  ref: string
): Promise<PublicCouncilQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_questions")
    .select(QUESTION_SELECT)
    .eq("is_published", true)
    .contains("bill_refs", [ref])
    .gte("meeting_key", `${year}-01`)
    .lte("meeting_key", `${year}-12`)
    .order("meeting_key", { ascending: false })
    .order("order_no", { ascending: true });
  if (error) {
    console.error("Failed to fetch questions for bill:", error);
    return [];
  }
  return (data ?? []).map((row) => toQuestion(row as QuestionRow));
}

/** 質問の大きな項目ごとの、公開中のテーマ */
export async function findThemesForQuestions(
  questionIds: string[]
): Promise<{ question_id: string; item_number: number; theme: PublicTheme }[]> {
  if (questionIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_question_themes")
    .select(
      "question_id, item_number, tags!inner(id, label, description, is_theme)"
    )
    .in("question_id", questionIds)
    .eq("tags.is_theme", true);
  if (error) {
    console.error("Failed to fetch question themes:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const tag = row.tags as unknown as PublicTheme & { is_theme: boolean };
    return {
      question_id: row.question_id,
      item_number: row.item_number,
      theme: { id: tag.id, label: tag.label, description: tag.description },
    };
  });
}

/** 項目に出てくる番号（例: 令和8年議案第99号）の、公開中の議案 */
export async function findPublishedBillsByNumbers(
  billNumbers: string[]
): Promise<LinkedBill[]> {
  if (billNumbers.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, bill_number, name")
    .in("bill_number", billNumbers)
    .eq("publish_status", "published")
    .eq("is_review_completed", true);
  if (error) {
    console.error("Failed to fetch linked bills:", error);
    return [];
  }
  return (data ?? []).flatMap((row) =>
    row.bill_number
      ? [{ id: row.id, bill_number: row.bill_number, name: row.name }]
      : []
  );
}

export async function findPublicThemes(): Promise<PublicThemeSummary[]> {
  const supabase = createAdminClient();
  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, label, description")
    .eq("is_theme", true)
    .order("theme_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("Failed to fetch themes:", error);
    return [];
  }
  const ids = (tags ?? []).map((tag) => tag.id);
  if (ids.length === 0) return [];

  const [bills, questions] = await Promise.all([
    supabase
      .from("bills_tags")
      .select("tag_id, bills!inner(id)")
      .in("tag_id", ids)
      .eq("bills.publish_status", "published")
      .eq("bills.is_review_completed", true),
    supabase
      .from("council_question_themes")
      .select("tag_id, council_questions!inner(id)")
      .in("tag_id", ids)
      .eq("council_questions.is_published", true),
  ]);
  const count = (rows: { tag_id: string }[] | null, id: string) =>
    (rows ?? []).filter((row) => row.tag_id === id).length;
  return (tags ?? []).map((tag) => ({
    ...tag,
    billCount: count(bills.data, tag.id),
    questionCount: count(questions.data, tag.id),
  }));
}

export async function findPublicThemeById(
  id: string
): Promise<PublicTheme | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, description")
    .eq("id", id)
    .eq("is_theme", true)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch theme:", error);
    return null;
  }
  return data;
}

export async function findThemeQuestionItems(
  themeId: string
): Promise<ThemeQuestionItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_question_themes")
    .select(
      `item_number, council_questions!inner(${QUESTION_SELECT}, is_published)`
    )
    .eq("tag_id", themeId)
    .eq("council_questions.is_published", true);
  if (error) {
    console.error("Failed to fetch theme questions:", error);
    return [];
  }
  return (data ?? [])
    .map((row) => ({
      itemNumber: row.item_number,
      question: toQuestion(row.council_questions as unknown as QuestionRow),
    }))
    .sort(
      (a, b) =>
        b.question.meeting_key.localeCompare(a.question.meeting_key) ||
        a.question.order_no - b.question.order_no ||
        a.itemNumber - b.itemNumber
    );
}

export async function findThemeBills(themeId: string): Promise<ThemeBill[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select(
      "bills!inner(id, name, bill_number, submitted_date, publish_status, is_review_completed, bill_contents(title, difficulty_level))"
    )
    .eq("tag_id", themeId)
    .eq("bills.publish_status", "published")
    .eq("bills.is_review_completed", true);
  if (error) {
    console.error("Failed to fetch theme bills:", error);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      const bill = row.bills as unknown as {
        id: string;
        name: string;
        bill_number: string | null;
        submitted_date: string | null;
        bill_contents: { title: string | null; difficulty_level: string }[];
      };
      const normal = bill.bill_contents?.find(
        (content) => content.difficulty_level === "normal"
      );
      return {
        id: bill.id,
        name: bill.name,
        title: normal?.title ?? null,
        bill_number: bill.bill_number,
        submitted_date: bill.submitted_date,
      };
    })
    .sort((a, b) =>
      (b.submitted_date ?? "").localeCompare(a.submitted_date ?? "")
    );
}
