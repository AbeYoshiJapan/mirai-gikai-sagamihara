import type { MeetingCategory } from "./resolve-meeting-label";

/**
 * 議会サイトのカレンダーから取った会議（候補）と、DB の会議予定を突き合わせ、
 * 「何をどう変えるか」を決める（純粋関数）。適用は admin のサービスが、この計画どおりに行う。
 *
 * 掲載方針：自動で取ったものは仮の取得。運営者が確認するまで公開しない。
 * - 新しい会議は「仮登録」（非公開）で入れる
 * - 運営者がまだ手を入れていない仮登録は、公式サイトの最新の内容で上書きする
 * - 運営者が手を入れた行・公開中の行は上書きしない。公式サイトの内容が前回の取得から
 *   変わっていたら「変更あり」（pending_update）として残し、運営者が反映するか決める
 * - 取得した月の範囲で公式サイトから消えた会議は、消さずに「公式サイトから消えた」として残す
 */

/** 公式サイトから読めた値（前回の取得との比較に使う） */
export type SiteMeetingSnapshot = {
  meeting_date: string;
  end_date: string | null;
  site_label: string;
  name: string;
  category: MeetingCategory;
  committee_id: string | null;
  start_time: string | null;
  place: string | null;
};

export type SiteMeetingCandidate = SiteMeetingSnapshot & {
  /** 詳細ページの URL（会議ごとに一意） */
  source_url: string;
  /** 略称から名前・区分を確かに決められたか */
  recognized: boolean;
};

export type ExistingSiteMeeting = SiteMeetingSnapshot & {
  id: string;
  source_url: string;
  is_published: boolean;
  operator_edited_at: string | null;
  site_snapshot: unknown;
  pending_update: unknown;
};

/** 比べる項目（運営者に見せる名前つき） */
export const SITE_MEETING_FIELDS = [
  "meeting_date",
  "end_date",
  "name",
  "category",
  "committee_id",
  "start_time",
  "place",
] as const;
export type SiteMeetingField = (typeof SITE_MEETING_FIELDS)[number];

export type PendingSiteUpdate =
  | {
      kind: "changed";
      /** 公式サイトの新しい値 */
      fields: Partial<Pick<SiteMeetingSnapshot, SiteMeetingField>>;
      /** 前回の取得での値 */
      previous: Partial<Pick<SiteMeetingSnapshot, SiteMeetingField>>;
      fetched_at: string;
    }
  | { kind: "removed"; fetched_at: string };

export type SiteImportUpdate = {
  id: string;
  /** 行の値を書き換える（運営者が手を入れていない仮登録だけ） */
  fields?: SiteMeetingSnapshot;
  site_snapshot: SiteMeetingSnapshot | null;
  /** undefined は変えない、null は消す */
  pending_update?: PendingSiteUpdate | null;
};

export type SiteImportPlan = {
  inserts: SiteMeetingCandidate[];
  updates: SiteImportUpdate[];
  summary: {
    added: number;
    /** 仮登録を公式サイトの最新の内容にした */
    refreshed: number;
    /** 確認済み・手を入れた行に「変更あり」を付けた */
    changed: number;
    /** 「公式サイトから消えた」を付けた */
    removed: number;
    unchanged: number;
  };
};

function toSnapshot(source: SiteMeetingSnapshot): SiteMeetingSnapshot {
  return {
    meeting_date: source.meeting_date,
    end_date: source.end_date ?? null,
    site_label: source.site_label,
    name: source.name,
    category: source.category,
    committee_id: source.committee_id ?? null,
    start_time: source.start_time ?? null,
    place: source.place ?? null,
  };
}

function readSnapshot(value: unknown): SiteMeetingSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<SiteMeetingSnapshot>;
  if (typeof v.meeting_date !== "string" || typeof v.name !== "string") {
    return null;
  }
  return toSnapshot(v as SiteMeetingSnapshot);
}

function pendingKind(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : null;
}

function sameSnapshot(a: SiteMeetingSnapshot, b: SiteMeetingSnapshot): boolean {
  return (
    SITE_MEETING_FIELDS.every((f) => a[f] === b[f]) && a.site_label === b.site_label
  );
}

function rowValues(row: ExistingSiteMeeting): SiteMeetingSnapshot {
  return toSnapshot(row);
}

/** 運営者が確認・編集した行か（自動では上書きしない） */
export function isTouchedByOperator(
  row: Pick<ExistingSiteMeeting, "is_published" | "operator_edited_at">
): boolean {
  return row.is_published || row.operator_edited_at !== null;
}

export function planSiteImport(params: {
  candidates: SiteMeetingCandidate[];
  /** 取得範囲の会議と、候補と同じ URL の会議（source = site のもの） */
  existing: ExistingSiteMeeting[];
  /** 取得した月の範囲（この範囲で見つからない会議を「消えた」とする） */
  range: { from: string; to: string };
  /** 取得日時（ISO） */
  now: string;
}): SiteImportPlan {
  const { candidates, existing, range, now } = params;
  const byUrl = new Map(existing.map((row) => [row.source_url, row]));
  const seenUrls = new Set<string>();
  const plan: SiteImportPlan = {
    inserts: [],
    updates: [],
    summary: { added: 0, refreshed: 0, changed: 0, removed: 0, unchanged: 0 },
  };

  for (const candidate of candidates) {
    if (seenUrls.has(candidate.source_url)) continue;
    seenUrls.add(candidate.source_url);

    const snapshot = toSnapshot(candidate);
    const row = byUrl.get(candidate.source_url);
    if (!row) {
      plan.inserts.push(candidate);
      plan.summary.added += 1;
      continue;
    }

    const wasRemoved = pendingKind(row.pending_update) === "removed";

    if (!isTouchedByOperator(row)) {
      const upToDate = sameSnapshot(rowValues(row), snapshot);
      if (upToDate && !wasRemoved) {
        plan.summary.unchanged += 1;
        if (!readSnapshot(row.site_snapshot)) {
          plan.updates.push({ id: row.id, site_snapshot: snapshot });
        }
        continue;
      }
      plan.updates.push({
        id: row.id,
        fields: snapshot,
        site_snapshot: snapshot,
        pending_update: null,
      });
      plan.summary.refreshed += 1;
      continue;
    }

    // 運営者が確認・編集した行：公式サイトが前回の取得から変わった項目だけを「変更あり」にする
    const previous = readSnapshot(row.site_snapshot);
    if (!previous) {
      plan.updates.push({
        id: row.id,
        site_snapshot: snapshot,
        ...(wasRemoved && { pending_update: null }),
      });
      plan.summary.unchanged += 1;
      continue;
    }

    const current = rowValues(row);
    const fields: Partial<Pick<SiteMeetingSnapshot, SiteMeetingField>> = {};
    const before: Partial<Pick<SiteMeetingSnapshot, SiteMeetingField>> = {};
    for (const field of SITE_MEETING_FIELDS) {
      // 公式サイトで変わり、しかも今の行の値と違うものだけ（運営者がもう直していれば出さない）
      if (previous[field] !== snapshot[field] && current[field] !== snapshot[field]) {
        Object.assign(fields, { [field]: snapshot[field] });
        Object.assign(before, { [field]: previous[field] });
      }
    }

    if (Object.keys(fields).length > 0) {
      plan.updates.push({
        id: row.id,
        site_snapshot: snapshot,
        pending_update: { kind: "changed", fields, previous: before, fetched_at: now },
      });
      plan.summary.changed += 1;
    } else if (wasRemoved || !sameSnapshot(previous, snapshot)) {
      plan.updates.push({
        id: row.id,
        site_snapshot: snapshot,
        ...(wasRemoved && { pending_update: null }),
      });
      plan.summary.unchanged += 1;
    } else {
      plan.summary.unchanged += 1;
    }
  }

  // 取得した範囲にあったのに、今回の公式サイトに無い会議
  for (const row of existing) {
    if (seenUrls.has(row.source_url)) continue;
    if (row.meeting_date < range.from || row.meeting_date > range.to) continue;
    if (pendingKind(row.pending_update) === "removed") continue;
    plan.updates.push({
      id: row.id,
      site_snapshot: readSnapshot(row.site_snapshot),
      pending_update: { kind: "removed", fetched_at: now },
    });
    plan.summary.removed += 1;
  }

  return plan;
}
