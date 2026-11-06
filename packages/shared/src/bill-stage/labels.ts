/**
 * 議案の種類・審議段階・結果の語彙と表示名。
 *
 * DB の enum（bill_kind / bill_stage / bill_result / bill_vote_outcome / bill_proposer_kind）と
 * 一致させる。web のカード・進捗・絞り込みと admin の編集フォームが共通で使う。
 * 国会由来の status（introduced / in_originating_house …）は互換のため DB に残るが、
 * 表示はこの語彙だけで決める。
 */

import type { DeliberationTiming } from "./deliberation-timing";

export const BILL_KINDS = [
  "ordinance",
  "budget",
  "settlement",
  "contract",
  "personnel",
  "property",
  "road",
  "senketsu",
  "member_bill",
  "opinion",
  "resolution",
  "petition",
  "citizen_petition",
  "report",
  "plan",
  "special_committee",
  "other",
] as const;
export type BillKind = (typeof BILL_KINDS)[number];

export const BILL_KIND_LABELS: Record<BillKind, string> = {
  ordinance: "条例",
  budget: "予算",
  settlement: "決算",
  contract: "契約",
  personnel: "人事",
  property: "財産の取得・処分",
  road: "市道の認定・廃止",
  senketsu: "専決処分",
  member_bill: "議員提出議案",
  opinion: "意見書",
  resolution: "決議",
  petition: "請願",
  citizen_petition: "陳情",
  report: "委員会報告",
  plan: "行政計画",
  special_committee: "特別委員会",
  other: "その他",
};

/** 審議・採決の流れに乗らない種類（報告・計画・特別委員会の議題） */
export const NON_DELIBERATION_KINDS = [
  "report",
  "plan",
  "special_committee",
] as const satisfies readonly BillKind[];

export function isDeliberationKind(kind: BillKind): boolean {
  return !(NON_DELIBERATION_KINDS as readonly BillKind[]).includes(kind);
}

export const PROPOSER_KINDS = ["mayor", "member", "committee", "citizen"] as const;
export type ProposerKind = (typeof PROPOSER_KINDS)[number];

export const PROPOSER_KIND_LABELS: Record<ProposerKind, string> = {
  mayor: "市長提出",
  member: "議員提出",
  committee: "委員会提出",
  citizen: "市民から（請願・陳情）",
};

export const BILL_STAGES = [
  "preparing",
  "submitted",
  "referred",
  "in_committee",
  "plenary",
  "decided",
] as const;
export type BillStage = (typeof BILL_STAGES)[number];

export const BILL_STAGE_LABELS: Record<BillStage, string> = {
  preparing: "提出前",
  submitted: "提出",
  referred: "委員会付託",
  in_committee: "委員会審査中",
  plenary: "本会議採決待ち",
  decided: "議決済み",
};

export const BILL_RESULTS = [
  "passed",
  "rejected",
  "approved",
  "consented",
  "adopted",
  "not_adopted",
  "continued",
  "withdrawn",
] as const;
export type BillResult = (typeof BILL_RESULTS)[number];

export const BILL_RESULT_LABELS: Record<BillResult, string> = {
  passed: "可決",
  rejected: "否決",
  approved: "承認",
  consented: "同意",
  adopted: "採択",
  not_adopted: "不採択",
  continued: "継続審査",
  withdrawn: "撤回",
};

/** 結果のうち「通った」もの */
export const POSITIVE_RESULTS = [
  "passed",
  "approved",
  "consented",
  "adopted",
] as const satisfies readonly BillResult[];

/** 結果のうち「通らなかった」もの */
export const NEGATIVE_RESULTS = [
  "rejected",
  "not_adopted",
  "withdrawn",
] as const satisfies readonly BillResult[];

export const VOTE_OUTCOMES = ["unanimous", "majority", "minority", "none"] as const;
export type VoteOutcome = (typeof VOTE_OUTCOMES)[number];

export const VOTE_OUTCOME_LABELS: Record<VoteOutcome, string> = {
  unanimous: "全会一致",
  majority: "賛成多数",
  minority: "賛成少数",
  none: "採決なし",
};

/** 表示に必要な最小限の列 */
export type BillStageInfo = {
  bill_kind: BillKind;
  stage: BillStage | null;
  result: BillResult | null;
  vote_outcome?: VoteOutcome | null;
};

/** 一覧の絞り込みタブ。URL のクエリ値になるので変えない */
export const BILL_STAGE_GROUPS = [
  "all",
  "deliberating",
  "waiting",
  "enacted",
  "rejected",
  "reported",
  "plan",
  "special_committee",
] as const;
export type BillStageGroup = (typeof BILL_STAGE_GROUPS)[number];

export const BILL_STAGE_GROUP_LABELS: Record<BillStageGroup, string> = {
  all: "すべて",
  deliberating: "審議中・継続中",
  waiting: "提出前",
  enacted: "可決・承認",
  rejected: "否決・不採択",
  reported: "委員会報告",
  plan: "行政計画",
  special_committee: "特別委員会",
};

/** 表示名の上書き（サイト設定 council.stage_labels / result_labels / in_progress_label など） */
export type BillLabelOverrides = {
  stage?: Partial<Record<BillStage, string>>;
  result?: Partial<Record<BillResult, string>>;
  /** 審議中の議案のカードに出す短い表示（例: 市議会審議中） */
  inProgress?: string;
  /** 定例会議と定例会議の間で、結論が持ち越されている議案の表示（既定「継続中」） */
  carriedOver?: string;
  /** 次の定例会議に向けて出され、まだ開会前の議案の表示（既定「審議予定」） */
  upcoming?: string;
};

export const DELIBERATION_TIMING_LABELS: Record<DeliberationTiming, string> = {
  in_session: "審議中",
  carried_over: "継続中",
  upcoming: "審議予定",
};

/** 結論が出ていない議案の表示。時期が分からなければ「審議中」 */
export function getPendingLabel(
  timing: DeliberationTiming | null | undefined,
  overrides?: BillLabelOverrides
): string {
  if (timing === "carried_over") {
    return overrides?.carriedOver || DELIBERATION_TIMING_LABELS.carried_over;
  }
  if (timing === "upcoming") {
    return overrides?.upcoming || DELIBERATION_TIMING_LABELS.upcoming;
  }
  return overrides?.inProgress || DELIBERATION_TIMING_LABELS.in_session;
}

export function getStageLabel(
  stage: BillStage,
  overrides?: BillLabelOverrides
): string {
  return overrides?.stage?.[stage] || BILL_STAGE_LABELS[stage];
}

export function getResultLabel(
  result: BillResult,
  overrides?: BillLabelOverrides
): string {
  return overrides?.result?.[result] || BILL_RESULT_LABELS[result];
}

export function isDecided(bill: BillStageInfo): boolean {
  return (
    isDeliberationKind(bill.bill_kind) &&
    bill.stage === "decided" &&
    bill.result !== null &&
    bill.result !== "continued"
  );
}

export function isInDeliberation(bill: BillStageInfo): boolean {
  if (!isDeliberationKind(bill.bill_kind)) return false;
  if (bill.stage === null || bill.stage === "preparing") return false;
  if (bill.stage === "decided") return bill.result === "continued";
  return true;
}

/**
 * 一覧カードの短い表示。
 * 報告・計画・特別委員会はその種類名、議決済みは結果、結論が出ていないものは
 * 時期（timing）に応じて「審議中」「継続中」「審議予定」。
 */
export function getBillOutcomeLabel(
  bill: BillStageInfo,
  overrides?: BillLabelOverrides,
  timing?: DeliberationTiming | null
): string {
  if (!isDeliberationKind(bill.bill_kind)) {
    return BILL_KIND_LABELS[bill.bill_kind];
  }
  if (bill.stage === "decided" && bill.result) {
    return getResultLabel(bill.result, overrides);
  }
  if (bill.stage === null || bill.stage === "preparing") {
    return getStageLabel("preparing", overrides);
  }
  return getPendingLabel(timing, overrides);
}

/**
 * 議決の表示（例: 可決（賛成多数））。採決なしや結果未定なら結果だけ。
 */
export function getBillDecisionLabel(
  bill: BillStageInfo,
  overrides?: BillLabelOverrides
): string | null {
  if (!isDeliberationKind(bill.bill_kind)) return null;
  if (bill.stage !== "decided" || !bill.result) return null;
  const result = getResultLabel(bill.result, overrides);
  const outcome = bill.vote_outcome;
  if (!outcome || outcome === "none" || bill.result === "continued") {
    return result;
  }
  return `${result}（${VOTE_OUTCOME_LABELS[outcome]}）`;
}

export function toBillStageGroup(
  bill: BillStageInfo
): Exclude<BillStageGroup, "all"> {
  if (bill.bill_kind === "report") return "reported";
  if (bill.bill_kind === "plan") return "plan";
  if (bill.bill_kind === "special_committee") return "special_committee";
  if (bill.stage === "decided" && bill.result) {
    if ((POSITIVE_RESULTS as readonly BillResult[]).includes(bill.result)) {
      return "enacted";
    }
    if ((NEGATIVE_RESULTS as readonly BillResult[]).includes(bill.result)) {
      return "rejected";
    }
    // continued（継続審査）
    return "deliberating";
  }
  if (bill.stage === null || bill.stage === "preparing") return "waiting";
  return "deliberating";
}

export function isBillStageGroup(value: unknown): value is BillStageGroup {
  return (
    typeof value === "string" &&
    (BILL_STAGE_GROUPS as readonly string[]).includes(value)
  );
}

/** カードの色分け */
export function getBillOutcomeVariant(
  bill: BillStageInfo
): "light" | "default" | "dark" | "muted" {
  const group = toBillStageGroup(bill);
  switch (group) {
    case "deliberating":
      return "light";
    case "enacted":
      return "default";
    case "rejected":
      return "dark";
    default:
      return "muted";
  }
}

/** 日付の後ろに付ける言葉。議案は「提出」、報告は「報告」、特別委員会は「開催」。 */
export function getBillDateLabel(kind: BillKind): string {
  switch (kind) {
    case "report":
      return "報告";
    case "special_committee":
      return "開催";
    case "plan":
      return "掲載";
    default:
      return "提出";
  }
}

/**
 * 進捗バーの段階。提出 → 委員会付託 → 委員会審査 → 本会議 → 議決 の 5 段階。
 * 報告・計画・特別委員会は進捗を出さない（null）。
 */
export const BILL_PROGRESS_STEPS = [
  { stage: "submitted", label: "提出" },
  { stage: "referred", label: "委員会付託" },
  { stage: "in_committee", label: "委員会審査" },
  { stage: "plenary", label: "本会議" },
  { stage: "decided", label: "議決" },
] as const satisfies readonly { stage: BillStage; label: string }[];

export function getBillProgressStep(bill: BillStageInfo): number | null {
  if (!isDeliberationKind(bill.bill_kind)) return null;
  switch (bill.stage) {
    case "submitted":
      return 1;
    case "referred":
      return 2;
    case "in_committee":
      return 3;
    case "plenary":
      return 4;
    case "decided":
      return bill.result === "continued" ? 3 : 5;
    default:
      return 0;
  }
}
