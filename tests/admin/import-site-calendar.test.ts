import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importSiteCalendar } from "../../admin/src/features/council-meetings/server/services/import-site-calendar";
import { adminClient } from "../supabase/utils";

/**
 * 議会サイトのカレンダーから会議予定を仮登録する処理を、本物の DB で確かめる。
 * 議会サイトへの通信は、ページの URL ごとに決めた HTML を返す偽物に差し替える。
 */

const ORIGIN = "https://calendar-test.example";
const TEMPLATE = `${ORIGIN}/top/{yyyy}/{mm}/`;
const TOP_2026_11 = readFileSync(
  path.join(
    __dirname,
    "../../packages/shared/src/council-meetings/__fixtures__/sagamihara-top-2026-11.html"
  ),
  "utf8"
);

const DETAILS: Record<string, string> = {
  "2026093000015":
    "<h1>議会運営委員会</h1><p>日時：令和8年11月10日 午前10時</p><p>場所：第1委員会室</p>",
  "2026093000022":
    "<h1>本会議</h1><p>日時：令和8年11月17日 午前9時30分</p><p>場所：本会議場</p>",
};

function fakeSite(overrides: Record<string, string> = {}) {
  return async (url: string): Promise<string> => {
    if (url === `${ORIGIN}/top/2026/11/`) {
      return TOP_2026_11.replaceAll(
        'href="/doc-calendar/',
        `href="${ORIGIN}/doc-calendar/`
      );
    }
    if (url.startsWith(`${ORIGIN}/top/`)) {
      return "<table><tr><td>1</td></tr></table>";
    }
    const id = url.match(/doc-calendar\/(\d+)\//)?.[1] ?? "";
    if (overrides[id] !== undefined) return overrides[id];
    if (DETAILS[id]) return DETAILS[id];
    throw new Error("404");
  };
}

const noWait = async () => {};
let previousImport: unknown = null;
const startedAt = new Date().toISOString();

async function siteMeetings() {
  const { data } = await adminClient
    .from("council_meetings")
    .select(
      "id, meeting_date, name, category, start_time, place, site_label, is_published, source, pending_update"
    )
    .like("source_url", `${ORIGIN}/%`)
    .order("meeting_date");
  return data ?? [];
}

describe("importSiteCalendar（会議予定の自動取得 → 仮登録）", () => {
  beforeAll(async () => {
    const { data } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "import")
      .maybeSingle();
    previousImport = data?.value ?? null;
    await adminClient.from("site_settings").upsert(
      {
        key: "import",
        value: {
          ...((previousImport as object | null) ?? {}),
          calendar_month_url: TEMPLATE,
        },
      },
      { onConflict: "key" }
    );
  });

  afterAll(async () => {
    await adminClient
      .from("council_meetings")
      .delete()
      .like("source_url", `${ORIGIN}/%`);
    await adminClient
      .from("import_runs")
      .delete()
      .eq("source_id", "council-calendar")
      .gte("started_at", startedAt);
    if (previousImport === null) {
      await adminClient.from("site_settings").delete().eq("key", "import");
    } else {
      await adminClient
        .from("site_settings")
        .upsert(
          { key: "import", value: previousImport },
          { onConflict: "key" }
        );
    }
  });

  it("カレンダーの会議を、非公開の仮登録で入れる（詳細ページの時刻・場所も入れる）", async () => {
    const result = await importSiteCalendar({
      triggeredBy: null,
      today: "2026-11-06",
      fetchText: fakeSite(),
      wait: noWait,
    });
    expect(result.ok).toBe(true);
    expect(result.added).toBe(8);

    const rows = await siteMeetings();
    expect(rows).toHaveLength(8);
    expect(
      rows.every((r) => r.is_published === false && r.source === "site")
    ).toBe(true);
    const plenary = rows.find((r) => r.meeting_date === "2026-11-17");
    expect(plenary).toMatchObject({
      name: "本会議",
      category: "plenary",
      start_time: "午前9時30分",
      place: "本会議場",
    });
    const steering = rows.find((r) => r.meeting_date === "2026-11-10");
    expect(steering).toMatchObject({
      name: "議会運営委員会",
      category: "steering",
      site_label: "議運",
    });
    // 詳細ページを読めなかった会議は、時刻・場所なしで入り、知らせが出る
    expect(
      result.warnings.some((w) => w.includes("詳細を読めませんでした"))
    ).toBe(true);
  });

  it("もう一度取得しても増えない。公開中の会議は書き換えず、公式サイトの変更を「変更あり」にする", async () => {
    const rows = await siteMeetings();
    const plenary = rows.find((r) => r.meeting_date === "2026-11-17");
    await adminClient
      .from("council_meetings")
      .update({ is_published: true, confirmed_at: new Date().toISOString() })
      .eq("id", plenary?.id ?? "");

    const result = await importSiteCalendar({
      triggeredBy: null,
      today: "2026-11-06",
      fetchText: fakeSite({
        "2026093000022":
          "<h1>本会議</h1><p>日時：令和8年11月17日 午後1時</p><p>場所：本会議場</p>",
      }),
      wait: noWait,
    });
    expect(result.ok).toBe(true);
    expect(result.added).toBe(0);
    expect(result.changed).toBe(1);

    const after = await siteMeetings();
    expect(after).toHaveLength(8);
    const updated = after.find((r) => r.meeting_date === "2026-11-17");
    // 公開中の値はそのまま。変更は保留にだけ入る
    expect(updated?.start_time).toBe("午前9時30分");
    expect(updated?.pending_update).toMatchObject({
      kind: "changed",
      fields: { start_time: "午後1時" },
      previous: { start_time: "午前9時30分" },
    });
  });

  it("カレンダーから 1 件も読めなければ、何も変えずに失敗にする", async () => {
    const before = await siteMeetings();
    const result = await importSiteCalendar({
      triggeredBy: null,
      today: "2026-11-06",
      fetchText: async () => "<html><body>メンテナンス中</body></html>",
      wait: noWait,
    });
    expect(result.ok).toBe(false);
    expect(await siteMeetings()).toEqual(before);
  });

  it("差し替えなしの本物の HTTP でも読める（User-Agent・文字コードの扱いを含めて）", async () => {
    const server = createServer((req, res) => {
      if (req.url === "/top/2026/11/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
        res.end(TOP_2026_11);
        return;
      }
      if (req.url?.startsWith("/top/")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
        res.end("<table><tr><td>1</td></tr></table>");
        return;
      }
      const id = req.url?.match(/doc-calendar\/(\d+)\//)?.[1] ?? "";
      if (DETAILS[id]) {
        res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
        res.end(DETAILS[id]);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await adminClient.from("site_settings").upsert(
        {
          key: "import",
          value: {
            ...((previousImport as object | null) ?? {}),
            calendar_month_url: `${origin}/top/{yyyy}/{mm}/`,
          },
        },
        { onConflict: "key" }
      );
      const result = await importSiteCalendar({
        triggeredBy: null,
        today: "2026-11-06",
        wait: noWait,
      });
      expect(result.error).toBeUndefined();
      expect(result.ok).toBe(true);
      expect(result.added).toBe(8);
      const { data } = await adminClient
        .from("council_meetings")
        .select("meeting_date, name, start_time")
        .like("source_url", `${origin}/%`)
        .eq("meeting_date", "2026-11-17")
        .single();
      expect(data).toMatchObject({ name: "本会議", start_time: "午前9時30分" });
    } finally {
      await adminClient
        .from("council_meetings")
        .delete()
        .like("source_url", `${origin}/%`);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
