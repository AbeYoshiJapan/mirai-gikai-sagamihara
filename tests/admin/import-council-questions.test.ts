import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importCouncilQuestions } from "../../admin/src/features/council-questions/server/services/import-council-questions";
import { adminClient } from "../supabase/utils";

/**
 * 議会サイトの通告一覧から議会での質問を仮登録する処理を、本物の DB で確かめる。
 * 議会サイトへの通信は、ページと PDF（令和8年9月定例会議の実物）を返す偽物に差し替える。
 */

const ORIGIN = "https://notice-test.example";
const PAGE_URL = `${ORIGIN}/doc/2013120900011/`;
const FIXTURES = path.join(
  __dirname,
  "../../admin/src/features/council-questions/shared/utils/fixtures"
);
const PAGE = `
<h3>代表質問・個人質疑通告一覧</h3>
<a href="file_contents/2026_tsukoku_09.pdf">令和８年定例会９月定例会議　代表質問・個人質疑通告一覧[PDF：458KB]</a>
<h3>一般質問通告一覧</h3>
<a href="file_contents/2026_juni_09.pdf">令和８年定例会９月定例会議　一般質問順位[PDF：78.7KB]</a>
<a href="file_contents/2026_ippantsukoku_09.pdf">令和８年定例会９月定例会議　一般質問通告一覧[PDF：434KB]</a>
`;

const deps = {
  fetchPage: async (url: string) => {
    if (url === PAGE_URL) return PAGE;
    throw new Error("404");
  },
  fetchPdf: async (url: string) => {
    const name = url.split("/").pop() ?? "";
    return new Uint8Array(readFileSync(path.join(FIXTURES, name)));
  },
  now: () => new Date("2026-09-25T00:00:00Z"),
};

const MEETING = "2026-09";

async function cleanup() {
  await adminClient
    .from("council_questions")
    .delete()
    .eq("meeting_key", MEETING);
}

async function rows() {
  const { data } = await adminClient
    .from("council_questions")
    .select(
      "id, list_kind, kind, order_no, member_name, question_date, is_published, pending_update, items, bill_refs"
    )
    .eq("meeting_key", MEETING)
    .order("list_kind", { ascending: false })
    .order("order_no");
  return data ?? [];
}

describe("importCouncilQuestions（本物の DB）", () => {
  beforeAll(cleanup);
  afterAll(cleanup);

  it("ページから通告一覧を見つけ、全員を仮登録する（公開しない）", async () => {
    const result = await importCouncilQuestions({ pageUrl: PAGE_URL }, deps);
    expect(result).toMatchObject({
      ok: true,
      meetingKey: MEETING,
      meetingName: "令和8年9月定例会議",
      inserted: 27,
      updated: 0,
      warnings: [],
    });
    const all = await rows();
    expect(all).toHaveLength(27);
    expect(all.every((row) => !row.is_published)).toBe(true);
    const representative = all.filter(
      (row) => row.list_kind === "representative"
    );
    expect(representative.map((row) => row.kind)).toEqual([
      ...Array(6).fill("representative"),
      "individual",
    ]);
    expect(representative[0]).toMatchObject({
      member_name: "寺田弘子",
      bill_refs: expect.arrayContaining(["議案第99号", "議案第105号"]),
    });
    const general = all.filter((row) => row.list_kind === "general");
    expect(general[0]).toMatchObject({
      order_no: 1,
      member_name: "務川慧",
      question_date: "2026-09-24",
    });
  });

  it("同じ内容をもう一度取り込んでも、増えも変わりもしない", async () => {
    const result = await importCouncilQuestions({ pageUrl: PAGE_URL }, deps);
    expect(result).toMatchObject({
      ok: true,
      inserted: 0,
      updated: 0,
      pending: 0,
      unchanged: 27,
    });
  });

  it("公開済みの質問は書き換えず、公式の内容が変わったことだけ残す。仮登録は置き換える", async () => {
    const [first, second] = (await rows()).filter(
      (row) => row.list_kind === "general"
    );
    // 1 人目は公開済み、2 人目は仮登録のまま。前回の写しを古いものにして「公式が変わった」ことにする
    await adminClient
      .from("council_questions")
      .update({
        is_published: true,
        confirmed_at: new Date().toISOString(),
        site_snapshot: { old: true },
        items: [
          { label: "1", level: 1, text: "運営者が確認した文言", children: [] },
        ],
      })
      .eq("id", first.id);
    await adminClient
      .from("council_questions")
      .update({ site_snapshot: { old: true }, items: [] })
      .eq("id", second.id);

    const result = await importCouncilQuestions({ pageUrl: PAGE_URL }, deps);
    expect(result).toMatchObject({ ok: true, updated: 1, pending: 1 });

    const after = (await rows()).filter((row) => row.list_kind === "general");
    expect(after[0].items).toEqual([
      { label: "1", level: 1, text: "運営者が確認した文言", children: [] },
    ]);
    expect(after[0].pending_update).toMatchObject({ kind: "changed" });
    expect((after[1].items as unknown[]).length).toBeGreaterThan(0);
    expect(after[1].pending_update).toBeNull();
  });

  it("ページに通告一覧が無ければ、何も変えずに知らせる", async () => {
    const result = await importCouncilQuestions(
      { pageUrl: PAGE_URL },
      { ...deps, fetchPage: async () => "<p>準備中</p>" }
    );
    expect(result).toMatchObject({ ok: false });
    expect(await rows()).toHaveLength(27);
  });
});
