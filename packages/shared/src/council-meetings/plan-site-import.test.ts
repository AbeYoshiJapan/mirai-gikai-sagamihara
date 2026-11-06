import { describe, expect, it } from "vitest";
import {
  type ExistingSiteMeeting,
  planSiteImport,
  type SiteMeetingCandidate,
  type SiteMeetingSnapshot,
} from "./plan-site-import";

const NOW = "2026-11-06T21:00:00.000Z";
const RANGE = { from: "2026-11-01", to: "2027-01-31" };

function candidate(
  overrides: Partial<SiteMeetingCandidate> = {}
): SiteMeetingCandidate {
  return {
    source_url: "https://www.sagamihara-shigikai.jp/doc-calendar/1/",
    meeting_date: "2026-11-17",
    end_date: null,
    site_label: "本会議",
    name: "本会議",
    category: "plenary",
    committee_id: null,
    start_time: "午前9時30分",
    place: "本会議場",
    recognized: true,
    ...overrides,
  };
}

function snapshotOf(c: SiteMeetingCandidate): SiteMeetingSnapshot {
  const { source_url: _url, recognized: _recognized, ...snapshot } = c;
  return snapshot;
}

function existing(
  overrides: Partial<ExistingSiteMeeting> = {}
): ExistingSiteMeeting {
  const c = candidate();
  return {
    ...snapshotOf(c),
    id: "m1",
    source_url: c.source_url,
    is_published: false,
    operator_edited_at: null,
    site_snapshot: snapshotOf(c),
    pending_update: null,
    ...overrides,
  };
}

describe("planSiteImport", () => {
  it("新しい会議は仮登録として追加する", () => {
    const plan = planSiteImport({
      candidates: [candidate()],
      existing: [],
      range: RANGE,
      now: NOW,
    });
    expect(plan.inserts).toHaveLength(1);
    expect(plan.summary.added).toBe(1);
    expect(plan.updates).toEqual([]);
  });

  it("運営者が手を入れていない仮登録は、公式サイトの最新の内容で上書きする", () => {
    const plan = planSiteImport({
      candidates: [candidate({ start_time: "午後1時" })],
      existing: [existing()],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([
      expect.objectContaining({
        id: "m1",
        fields: expect.objectContaining({ start_time: "午後1時" }),
        pending_update: null,
      }),
    ]);
    expect(plan.summary.refreshed).toBe(1);
  });

  it("変わっていなければ何もしない", () => {
    const plan = planSiteImport({
      candidates: [candidate()],
      existing: [existing()],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([]);
    expect(plan.summary.unchanged).toBe(1);
  });

  it("公開中（確認済み）の会議は上書きせず、公式サイトで変わった項目を「変更あり」にする", () => {
    const plan = planSiteImport({
      candidates: [candidate({ start_time: "午後1時", place: "第1委員会室" })],
      existing: [existing({ is_published: true })],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([
      {
        id: "m1",
        site_snapshot: expect.objectContaining({ start_time: "午後1時" }),
        pending_update: {
          kind: "changed",
          fields: { start_time: "午後1時", place: "第1委員会室" },
          previous: { start_time: "午前9時30分", place: "本会議場" },
          fetched_at: NOW,
        },
      },
    ]);
    expect(plan.updates[0]).not.toHaveProperty("fields");
    expect(plan.summary.changed).toBe(1);
  });

  it("運営者が直した名前は、公式サイトの略称が変わらない限り「変更あり」にしない", () => {
    const plan = planSiteImport({
      candidates: [candidate()],
      existing: [
        existing({
          name: "本会議（開会・提案説明）",
          operator_edited_at: "2026-11-05T00:00:00Z",
        }),
      ],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([]);
    expect(plan.summary.changed).toBe(0);
  });

  it("公式サイトで変わっても、運営者がもう同じ値に直していれば「変更あり」にしない", () => {
    const plan = planSiteImport({
      candidates: [candidate({ start_time: "午後1時" })],
      existing: [
        existing({
          start_time: "午後1時",
          operator_edited_at: "2026-11-05T00:00:00Z",
        }),
      ],
      range: RANGE,
      now: NOW,
    });
    expect(plan.summary.changed).toBe(0);
    // 前回の値は新しくしておく
    expect(plan.updates).toEqual([
      {
        id: "m1",
        site_snapshot: expect.objectContaining({ start_time: "午後1時" }),
      },
    ]);
  });

  it("取得した範囲で公式サイトから消えた会議は、消さずに「公式サイトから消えた」にする", () => {
    const plan = planSiteImport({
      candidates: [],
      existing: [
        existing({ is_published: true }),
        // 範囲の外は対象にしない
        existing({
          id: "m2",
          source_url: "u2",
          meeting_date: "2026-10-01",
        }),
      ],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([
      {
        id: "m1",
        site_snapshot: expect.objectContaining({ meeting_date: "2026-11-17" }),
        pending_update: { kind: "removed", fetched_at: NOW },
      },
    ]);
    expect(plan.summary.removed).toBe(1);
  });

  it("消えた会議がまた載ったら「消えた」を外す", () => {
    const plan = planSiteImport({
      candidates: [candidate()],
      existing: [
        existing({
          is_published: true,
          pending_update: { kind: "removed", fetched_at: NOW },
        }),
      ],
      range: RANGE,
      now: NOW,
    });
    expect(plan.updates).toEqual([
      { id: "m1", site_snapshot: expect.any(Object), pending_update: null },
    ]);
  });

  it("同じ URL の候補が重なっても 1 件として扱う", () => {
    const plan = planSiteImport({
      candidates: [candidate(), candidate()],
      existing: [],
      range: RANGE,
      now: NOW,
    });
    expect(plan.inserts).toHaveLength(1);
  });
});
