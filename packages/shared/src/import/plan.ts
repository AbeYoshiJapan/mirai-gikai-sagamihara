import { toJstDateKeyOf } from "../bill-stage/deliberation-timing";
import type {
  BillKind,
  BillResult,
  BillStage,
  ProposerKind,
  VoteOutcome,
} from "../bill-stage/labels";
import type { MeetingPeriod } from "../diet-sessions/meeting-periods";
import type { ImportBundle, ImportItem, ImportResultItem } from "./schema";
import {
  findAgendaMeetingPeriod,
  provisionalSubmittedDate,
} from "./submitted-date";

/**
 * 取込 JSON と DB の議案を突き合わせ、「何をどう変えるか」の計画を作る（純粋関数）。
 * 適用は admin の Server Action が、この計画をそのまま実行する。
 *
 * 方針:
 * - 突合キーは citation（「令和8年議案第99号」= bills.bill_number）。無ければ同じ会期の同名の議案
 * - 新規は下書き（publish_status = draft）で作る。公開はしない
 * - 既存の件名・区分は上書きしない（管理者が直した値を守る）。空の項目だけ埋める
 * - 審議段階は前に進める方向にだけ更新する（議決済みは触らない）
 * - 一次資料（PDF の URL）は無ければ足し、本文（抽出テキスト）はハッシュが変わっていれば入れ替える
 * - 提出日は議案書に書かれた日付を正とする。議案書がまだ無ければ定例会議の初日を仮に入れ
 *   （submitted-date.ts）、議案書が載ったら議案書の日付にする案を出す
 */

export type ExistingBillSource = {
  id: string;
  kind: string;
  url: string;
  content_hash: string | null;
  has_text: boolean;
};

export type ExistingBill = {
  id: string;
  name: string;
  bill_number: string | null;
  bill_kind: BillKind;
  proposer_kind: ProposerKind;
  committee_id: string | null;
  stage: BillStage | null;
  result: BillResult | null;
  vote_outcome: VoteOutcome | null;
  decided_on: string | null;
  submitted_date: string | null;
  status_note: string | null;
  publish_status: string;
  diet_session_id: string | null;
  sources: ExistingBillSource[];
};

export type CommitteeRef = { id: string; name: string; short_name: string };

export type FieldChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

export type SourceChange = {
  kind: string;
  url: string;
  label: string;
  /** 本文（抽出テキスト）を入れる・入れ替える */
  text: string | null;
  contentHash: string | null;
  action: "add" | "update_text" | "none";
  existingId: string | null;
};

export type BillDraft = {
  name: string;
  bill_number: string;
  bill_kind: BillKind;
  proposer_kind: ProposerKind;
  committee_id: string | null;
  stage: BillStage;
  submitted_date: string | null;
  diet_session_id: string;
};

export type PlanEntry = {
  citation: string;
  name: string;
  action: "create" | "update" | "skip";
  reason: string | null;
  existingId: string | null;
  existingPublishStatus: string | null;
  /** 新規のときの挿入内容 */
  draft: BillDraft | null;
  /** 既存のときの変更（空なら変更なし） */
  changes: FieldChange[];
  sources: SourceChange[];
  warnings: string[];
};

export type ImportPlan = {
  mode: "agenda" | "results";
  entries: PlanEntry[];
  summary: { create: number; update: number; skip: number; warnings: number };
  /** 付議事件一覧の会議に当たる定例会議の期間（仮の提出日に初日を使う）。見つからなければ null */
  meetingPeriod?: MeetingPeriod | null;
};

const STAGE_ORDER: Record<BillStage, number> = {
  preparing: 0,
  submitted: 1,
  referred: 2,
  in_committee: 3,
  plenary: 4,
  decided: 5,
};

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").normalize("NFKC");
}

export function findCommittee(
  committees: CommitteeRef[],
  name: string
): CommitteeRef | null {
  const key = normalizeName(name);
  return (
    committees.find((c) => normalizeName(c.name) === key) ??
    committees.find((c) => c.short_name && normalizeName(c.short_name) === key) ??
    committees.find(
      (c) => key.replace(/委員会$/, "") === normalizeName(c.short_name || "")
    ) ??
    null
  );
}

function matchExisting(
  citation: string,
  name: string,
  sessionId: string,
  existing: ExistingBill[]
): ExistingBill | null {
  const byNumber = existing.find((b) => b.bill_number === citation);
  if (byNumber) return byNumber;
  const key = normalizeName(name);
  return (
    existing.find(
      (b) =>
        !b.bill_number &&
        b.diet_session_id === sessionId &&
        normalizeName(b.name) === key
    ) ?? null
  );
}

function sourceLabelFor(item: ImportItem): string {
  switch (item.kind) {
    case "petition":
      return "陳情書";
    case "request":
      return "請願書";
    case "member_bill":
      return "議提議案";
    case "committee_bill":
      return "委員会提出議案";
    default:
      return "議案書";
  }
}

function planSources(
  item: ImportItem,
  agendaUrl: string | null,
  existing: ExistingBill | null
): SourceChange[] {
  const sources: SourceChange[] = [];
  const document = item.document;
  if (document?.url) {
    const text = document.text.trim().length > 0 ? buildSourceText(item) : null;
    const current = existing?.sources.find((s) => s.url === document.url) ?? null;
    let action: SourceChange["action"] = "none";
    if (!current) action = "add";
    else if (text && (current.content_hash !== document.sha256 || !current.has_text))
      action = "update_text";
    sources.push({
      kind: "bill_pdf",
      url: document.url,
      label: sourceLabelFor(item),
      text,
      contentHash: document.sha256,
      action,
      existingId: current?.id ?? null,
    });
  }
  if (agendaUrl) {
    const current = existing?.sources.find((s) => s.url === agendaUrl) ?? null;
    sources.push({
      kind: "agenda_pdf",
      url: agendaUrl,
      label: "付議事件一覧",
      text: null,
      contentHash: null,
      action: current ? "none" : "add",
      existingId: current?.id ?? null,
    });
  }
  return sources;
}

/** 解説生成に渡す本文。提案の理由と関係資料（改正の概要）を先頭に置くと要点が伝わりやすい */
export function buildSourceText(item: ImportItem): string {
  const document = item.document;
  if (!document) return "";
  const parts: string[] = [];
  if (document.proposal_reason) {
    parts.push(`【提案の理由】\n${document.proposal_reason}`);
  }
  if (document.materials_text) {
    parts.push(`【関係資料】\n${document.materials_text}`);
  }
  parts.push(`【本文】\n${document.text}`);
  return parts.join("\n\n");
}

function findAgendaUrl(bundle: ImportBundle): string | null {
  return bundle.source.files.find((f) => f.label === "付議事件一覧")?.url ?? null;
}

/**
 * 既存の議案の提出日をどう直すか。
 * - 空なら埋める（議案書の提出日、無ければ仮の提出日）
 * - 議案書に書かれた提出日と違えば、議案書の日付にする案を出す
 * - 議案書が無く、いまの提出日が一覧の日付（前の取込で入れた仮の日付）なら、定例会議の初日にする案を出す
 * それ以外（運営者が入れた日付など）は、議案書が載るまで触らない。
 */
function planSubmittedDateChange(
  current: string | null,
  fromDocument: string | null,
  provisional: string | null,
  agendaAsOf: string | null
): FieldChange | null {
  const currentKey = toJstDateKeyOf(current);
  if (!currentKey) {
    const to = fromDocument ?? provisional;
    return to ? { field: "submitted_date", label: "提出日", from: null, to } : null;
  }
  if (fromDocument) {
    return currentKey === fromDocument
      ? null
      : { field: "submitted_date", label: "提出日（議案書の日付）", from: currentKey, to: fromDocument };
  }
  if (provisional && currentKey === agendaAsOf && provisional !== currentKey) {
    return { field: "submitted_date", label: "提出日（定例会議の初日）", from: currentKey, to: provisional };
  }
  return null;
}

export function planAgendaImport(
  bundle: ImportBundle,
  existing: ExistingBill[],
  committees: CommitteeRef[],
  sessionId: string,
  /** 選んだ会期の「定例会議などの期間」。議案書の無い議案の提出日を、定例会議の初日にするのに使う */
  meetingPeriods: MeetingPeriod[] = []
): ImportPlan {
  const agendaUrl = findAgendaUrl(bundle);
  const meetingPeriod = findAgendaMeetingPeriod(bundle.meeting, meetingPeriods);
  const entries: PlanEntry[] = bundle.items.map((item) => {
    const warnings = [...item.warnings];
    const provisionalDate = provisionalSubmittedDate(
      bundle.meeting,
      meetingPeriod,
      item.added_this_time
    );
    const committee = item.committees[0]
      ? findCommittee(committees, item.committees[0])
      : null;
    if (item.committees[0] && !committee) {
      warnings.push(`委員会「${item.committees[0]}」が登録されていません`);
    }
    if (item.committees.length > 1) {
      warnings.push(`複数の委員会に付託（${item.committees.join("・")}）。先頭だけを付託先にします`);
    }
    const found = matchExisting(item.citation, item.name, sessionId, existing);
    const sources = planSources(item, agendaUrl, found);

    if (!found) {
      const stage: BillStage = committee ? "referred" : "submitted";
      return {
        citation: item.citation,
        name: item.name,
        action: "create",
        reason: null,
        existingId: null,
        existingPublishStatus: null,
        draft: {
          name: item.name,
          bill_number: item.citation,
          bill_kind: item.bill_kind,
          proposer_kind: item.proposer_kind,
          committee_id: committee?.id ?? null,
          stage,
          submitted_date: item.submitted_on ?? provisionalDate,
          diet_session_id: sessionId,
        },
        changes: [],
        sources,
        warnings,
      };
    }

    const changes: FieldChange[] = [];
    if (!found.bill_number) {
      changes.push({ field: "bill_number", label: "議案番号", from: null, to: item.citation });
    }
    if (normalizeName(found.name) !== normalizeName(item.name)) {
      warnings.push(`件名が違います（登録: ${found.name}）。件名は上書きしません`);
    }
    if (!found.committee_id && committee) {
      changes.push({ field: "committee_id", label: "付託先", from: null, to: committee.name });
    }
    if (found.bill_kind === "other" && item.bill_kind !== "other") {
      changes.push({ field: "bill_kind", label: "種類", from: "other", to: item.bill_kind });
    }
    const submittedChange = planSubmittedDateChange(
      found.submitted_date,
      item.submitted_on,
      provisionalDate,
      bundle.meeting.as_of
    );
    if (submittedChange) changes.push(submittedChange);
    const currentStage = found.stage ?? "preparing";
    const nextStage: BillStage = committee || found.committee_id ? "referred" : "submitted";
    if (STAGE_ORDER[nextStage] > STAGE_ORDER[currentStage]) {
      changes.push({ field: "stage", label: "審議段階", from: currentStage, to: nextStage });
    }
    const sourceWork = sources.some((s) => s.action !== "none");
    const action: PlanEntry["action"] = changes.length > 0 || sourceWork ? "update" : "skip";
    return {
      citation: item.citation,
      name: item.name,
      action,
      reason: action === "skip" ? "変更なし" : null,
      existingId: found.id,
      existingPublishStatus: found.publish_status,
      draft: null,
      changes,
      sources,
      warnings,
    };
  });
  return { mode: "agenda", entries, summary: summarize(entries), meetingPeriod };
}

export function planResultsImport(
  bundle: ImportBundle,
  existing: ExistingBill[],
  committees: CommitteeRef[],
  sessionId: string
): ImportPlan {
  const resultUrl = bundle.source.files.find((f) => f.label === "審議結果")?.url ?? null;
  const entries: PlanEntry[] = bundle.results.map((result: ImportResultItem) => {
    const warnings = [...result.warnings];
    const found = matchExisting(result.citation, result.name, sessionId, existing);
    if (!found) {
      return {
        citation: result.citation,
        name: result.name,
        action: "skip",
        reason: "議案が登録されていません（先に付議事件一覧を取り込んでください）",
        existingId: null,
        existingPublishStatus: null,
        draft: null,
        changes: [],
        sources: [],
        warnings,
      };
    }
    const changes: FieldChange[] = [];
    if (!result.result) {
      return {
        citation: result.citation,
        name: result.name,
        action: "skip",
        reason: `結果を解釈できませんでした（${result.raw_result || "空"}）`,
        existingId: found.id,
        existingPublishStatus: found.publish_status,
        draft: null,
        changes: [],
        sources: [],
        warnings,
      };
    }
    if (result.result === "continued") {
      // 継続審査は議決ではないので、段階は委員会審査中のままにする
      if ((found.stage ?? "preparing") !== "in_committee" && found.stage !== "decided") {
        changes.push({ field: "stage", label: "審議段階", from: found.stage, to: "in_committee" });
      }
      if (found.result !== "continued") {
        changes.push({ field: "result", label: "結果", from: found.result, to: "continued" });
      }
    } else {
      if (found.stage !== "decided") {
        changes.push({ field: "stage", label: "審議段階", from: found.stage, to: "decided" });
      }
      if (found.result !== result.result) {
        changes.push({ field: "result", label: "結果", from: found.result, to: result.result });
      }
      if (result.vote_outcome && found.vote_outcome !== result.vote_outcome) {
        changes.push({
          field: "vote_outcome",
          label: "採決",
          from: found.vote_outcome,
          to: result.vote_outcome,
        });
      }
      if (result.decided_on && found.decided_on !== result.decided_on) {
        changes.push({ field: "decided_on", label: "議決日", from: found.decided_on, to: result.decided_on });
      }
      // 「賛成なし」はサイトの採決区分に無く「賛成少数」に寄せるので、原文を補足に残す
      if (result.raw_result.includes("賛成なし") && !found.status_note) {
        changes.push({
          field: "status_note",
          label: "補足",
          from: null,
          to: `本会議の議決結果：${result.raw_result}`,
        });
      }
    }
    const committee = result.committees[0] ? findCommittee(committees, result.committees[0]) : null;
    if (!found.committee_id && committee) {
      changes.push({ field: "committee_id", label: "付託先", from: null, to: committee.name });
    }
    const sources: SourceChange[] = [];
    if (resultUrl) {
      const current = found.sources.find((s) => s.url === resultUrl) ?? null;
      sources.push({
        kind: "result_pdf",
        url: resultUrl,
        label: "審議結果",
        text: null,
        contentHash: null,
        action: current ? "none" : "add",
        existingId: current?.id ?? null,
      });
    }
    const sourceWork = sources.some((s) => s.action !== "none");
    const action: PlanEntry["action"] = changes.length > 0 || sourceWork ? "update" : "skip";
    return {
      citation: result.citation,
      name: result.name,
      action,
      reason: action === "skip" ? "変更なし" : null,
      existingId: found.id,
      existingPublishStatus: found.publish_status,
      draft: null,
      changes,
      sources,
      warnings,
    };
  });
  return { mode: "results", entries, summary: summarize(entries) };
}

function summarize(entries: PlanEntry[]): ImportPlan["summary"] {
  return {
    create: entries.filter((e) => e.action === "create").length,
    update: entries.filter((e) => e.action === "update").length,
    skip: entries.filter((e) => e.action === "skip").length,
    warnings: entries.reduce((n, e) => n + e.warnings.length, 0),
  };
}

/** 取込 JSON の中身から、議案の一覧か審議結果かを決める */
export function detectImportMode(bundle: ImportBundle): "agenda" | "results" {
  if (bundle.results.length > 0 && bundle.items.length === 0) return "results";
  return "agenda";
}
