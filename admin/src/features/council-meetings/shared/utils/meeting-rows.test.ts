import { describe, expect, it } from "vitest";
import {
  jstDateKey,
  pendingChangeColumns,
  toMeetingColumns,
  toSiteInsertRow,
} from "./meeting-rows";

describe("jstDateKey", () => {
  it("日本時間の日付にする（UTC の 15 時以降は翌日）", () => {
    expect(jstDateKey(new Date("2026-11-06T14:59:59Z"))).toBe("2026-11-06");
    expect(jstDateKey(new Date("2026-11-06T15:00:00Z"))).toBe("2026-11-07");
  });
});

describe("toMeetingColumns", () => {
  it("空欄は null にし、出典が空なら既定の URL、議会年度は開催日から決める", () => {
    const columns = toMeetingColumns(
      {
        meeting_date: "2027-03-02",
        end_date: "",
        name: " 予算特別委員会 ",
        category: "special",
        committee_id: "",
        start_time: "午前10時",
        place: "",
        topic: "",
        session_label: "3月定例会議",
        source_url: "",
        stream_url: "",
        minutes_url: "",
        agenda_pdf_url: "",
        result_pdf_url: "",
        publish: true,
      },
      { yearStartMonth: 4, defaultSourceUrl: "https://example.jp/schedule" }
    );
    expect(columns).toMatchObject({
      name: "予算特別委員会",
      end_date: null,
      committee_id: null,
      place: null,
      start_time: "午前10時",
      source_url: "https://example.jp/schedule",
      council_year: 2026,
    });
  });
});

describe("toSiteInsertRow", () => {
  it("公式サイトの会議は、取得元 site・非公開（仮登録）で、前回の値を持たせて入れる", () => {
    const row = toSiteInsertRow(
      {
        source_url: "https://www.sagamihara-shigikai.jp/doc-calendar/1/",
        meeting_date: "2026-11-17",
        end_date: null,
        site_label: "本会議",
        name: "本会議",
        category: "plenary",
        committee_id: null,
        start_time: null,
        place: null,
        recognized: true,
      },
      { yearStartMonth: 4, fetchedAt: "2026-11-06T21:00:00Z" }
    );
    expect(row).toMatchObject({
      source: "site",
      is_published: false,
      site_label: "本会議",
      council_year: 2026,
      fetched_at: "2026-11-06T21:00:00Z",
      site_snapshot: expect.objectContaining({ meeting_date: "2026-11-17" }),
    });
    expect(row.site_snapshot).not.toHaveProperty("recognized");
  });
});

describe("pendingChangeColumns", () => {
  it("変わった項目だけを書き換え、日付が変わったら議会年度も合わせる", () => {
    expect(
      pendingChangeColumns(
        {
          kind: "changed",
          fields: { meeting_date: "2027-04-02", place: "第1委員会室" },
          previous: {},
          fetched_at: "x",
        },
        4
      )
    ).toEqual({
      meeting_date: "2027-04-02",
      place: "第1委員会室",
      council_year: 2027,
    });
    expect(
      pendingChangeColumns({ kind: "removed", fetched_at: "x" }, 4)
    ).toBeNull();
  });
});
