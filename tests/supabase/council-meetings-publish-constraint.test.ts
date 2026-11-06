import { afterAll, describe, expect, it } from "vitest";
import { adminClient } from "./utils";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

describe("council_meetings：公開中は確認済み・公式サイトの会議は二重登録しない", () => {
  const ids: string[] = [];

  afterAll(async () => {
    if (ids.length > 0) {
      await adminClient.from("council_meetings").delete().in("id", ids);
    }
  });

  async function insertMeeting(fields: {
    is_published: boolean;
    confirmed_at?: string | null;
    source?: "manual" | "site";
    source_url?: string;
  }) {
    const result = await adminClient
      .from("council_meetings")
      .insert({
        meeting_date: "2026-11-17",
        name: `制約テスト ${Date.now()}`,
        category: "plenary",
        council_year: 2026,
        source_url: fields.source_url ?? "https://example.com/manual",
        source: fields.source ?? "manual",
        is_published: fields.is_published,
        confirmed_at: fields.confirmed_at ?? null,
      })
      .select("id")
      .single();
    if (result.data) ids.push(result.data.id);
    return result;
  }

  it("確認日時のない行は公開にできない", async () => {
    const { error } = await insertMeeting({ is_published: true });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("確認日時があれば公開にできる", async () => {
    const { error } = await insertMeeting({
      is_published: true,
      confirmed_at: new Date().toISOString(),
    });
    expect(error).toBeNull();
  });

  it("仮登録（非公開）は確認日時なしで入る。あとから確認日時なしで公開にはできない", async () => {
    const { data, error } = await insertMeeting({ is_published: false });
    expect(error).toBeNull();

    const { error: publishError } = await adminClient
      .from("council_meetings")
      .update({ is_published: true })
      .eq("id", data?.id ?? "");
    expect(publishError?.code).toBe(CHECK_VIOLATION);
  });

  it("公式サイトから取った会議は、同じ詳細ページの URL で二重に登録できない", async () => {
    const url = `https://www.sagamihara-shigikai.jp/doc-calendar/test-${Date.now()}/`;
    const first = await insertMeeting({
      is_published: false,
      source: "site",
      source_url: url,
    });
    expect(first.error).toBeNull();

    const second = await insertMeeting({
      is_published: false,
      source: "site",
      source_url: url,
    });
    expect(second.error?.code).toBe(UNIQUE_VIOLATION);

    // 手入力の行は同じ出典 URL でもよい（議会の日程ページなどを出典にする）
    const manual = await insertMeeting({
      is_published: false,
      source: "manual",
      source_url: url,
    });
    expect(manual.error).toBeNull();
  });
});
