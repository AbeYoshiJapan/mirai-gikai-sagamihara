import { afterAll, describe, expect, it } from "vitest";
import { adminClient } from "./utils";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

describe("council_questions：公開中は確認済み・同じ一覧の同じ順位は二重に入らない", () => {
  const meetingKey = `20${String(Date.now()).slice(-2)}-12`;
  const questionIds: string[] = [];
  const tagIds: string[] = [];

  afterAll(async () => {
    if (questionIds.length > 0) {
      await adminClient
        .from("council_questions")
        .delete()
        .in("id", questionIds);
    }
    if (tagIds.length > 0) {
      await adminClient.from("tags").delete().in("id", tagIds);
    }
  });

  async function insertQuestion(fields: {
    order_no: number;
    is_published?: boolean;
    confirmed_at?: string | null;
    meeting_key?: string;
  }) {
    const result = await adminClient
      .from("council_questions")
      .insert({
        meeting_key: fields.meeting_key ?? meetingKey,
        meeting_name: "令和8年12月定例会議",
        list_kind: "general",
        kind: "general",
        order_no: fields.order_no,
        member_name: "制約テスト",
        items: [{ label: "1", level: 1, text: "テストについて", children: [] }],
        is_published: fields.is_published ?? false,
        confirmed_at: fields.confirmed_at ?? null,
      })
      .select("id")
      .single();
    if (result.data) questionIds.push(result.data.id);
    return result;
  }

  it("確認日時のない行は公開にできない。仮登録から確認日時なしで公開にもできない", async () => {
    const published = await insertQuestion({ order_no: 1, is_published: true });
    expect(published.error?.code).toBe(CHECK_VIOLATION);

    const draft = await insertQuestion({ order_no: 2 });
    expect(draft.error).toBeNull();
    const { error } = await adminClient
      .from("council_questions")
      .update({ is_published: true })
      .eq("id", draft.data?.id ?? "");
    expect(error?.code).toBe(CHECK_VIOLATION);

    const confirmed = await adminClient
      .from("council_questions")
      .update({ is_published: true, confirmed_at: new Date().toISOString() })
      .eq("id", draft.data?.id ?? "");
    expect(confirmed.error).toBeNull();
  });

  it("同じ定例会議・同じ一覧の同じ順位は二重に入らない", async () => {
    const first = await insertQuestion({ order_no: 3 });
    expect(first.error).toBeNull();
    const second = await insertQuestion({ order_no: 3 });
    expect(second.error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("定例会議の鍵の形と、項目が配列であることを確かめる", async () => {
    const badKey = await insertQuestion({
      order_no: 4,
      meeting_key: "2026-13",
    });
    expect(badKey.error?.code).toBe(CHECK_VIOLATION);

    const draft = await insertQuestion({ order_no: 5 });
    const { error } = await adminClient
      .from("council_questions")
      .update({ items: { not: "array" } })
      .eq("id", draft.data?.id ?? "");
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("テーマのひも付けは、質問かテーマを消すと一緒に消える", async () => {
    const draft = await insertQuestion({ order_no: 6 });
    const tag = await adminClient
      .from("tags")
      .insert({ label: `テーマ制約テスト ${Date.now()}`, is_theme: true })
      .select("id")
      .single();
    expect(tag.error).toBeNull();
    if (tag.data) tagIds.push(tag.data.id);

    const link = await adminClient.from("council_question_themes").insert({
      question_id: draft.data?.id ?? "",
      item_number: 1,
      tag_id: tag.data?.id ?? "",
    });
    expect(link.error).toBeNull();

    await adminClient
      .from("council_questions")
      .delete()
      .eq("id", draft.data?.id ?? "");
    const { data } = await adminClient
      .from("council_question_themes")
      .select("question_id")
      .eq("tag_id", tag.data?.id ?? "");
    expect(data).toEqual([]);
  });
});
