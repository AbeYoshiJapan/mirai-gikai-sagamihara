import type {
  CouncilQuestionKind,
  NoticeItem,
  ParsedNoticeList,
  ParsedQuestionOrder,
} from "../types";
import { extractBillRefs, squeeze } from "./notice-text";
import { flattenItems } from "./parse-notice";

/** 通告一覧から作る、議会での質問 1 件分（仮登録の中身） */
export type CouncilQuestionDraft = {
  meetingKey: string;
  meetingName: string;
  /** どちらの通告一覧から来たか（順位はそれぞれの一覧の中の番号） */
  listKind: "representative" | "general";
  kind: CouncilQuestionKind;
  order: number;
  seatNumber: number | null;
  memberName: string;
  factionLabel: string;
  method: string | null;
  questionDate: string | null;
  noticeDate: string | null;
  items: NoticeItem[];
  billRefs: string[];
  sourceUrl: string | null;
};

/** 公式の内容が変わったかを見るための写し（運営者が変えられる区分は入れない） */
export type QuestionSnapshot = Pick<
  CouncilQuestionDraft,
  | "seatNumber"
  | "memberName"
  | "factionLabel"
  | "method"
  | "questionDate"
  | "noticeDate"
  | "items"
  | "sourceUrl"
>;

export function snapshotOf(draft: CouncilQuestionDraft): QuestionSnapshot {
  return {
    seatNumber: draft.seatNumber,
    memberName: draft.memberName,
    factionLabel: draft.factionLabel,
    method: draft.method,
    questionDate: draft.questionDate,
    noticeDate: draft.noticeDate,
    items: draft.items,
    sourceUrl: draft.sourceUrl,
  };
}

/** 会派に属さない議員の質疑は個人質疑、会派の質問は代表質問として仮に分ける（運営者が直せる） */
export function classifyRepresentativeKind(
  factionLabel: string
): CouncilQuestionKind {
  return squeeze(factionLabel) === "無所属" ? "individual" : "representative";
}

export function collectBillRefs(items: NoticeItem[]): string[] {
  const refs = new Set<string>();
  for (const item of flattenItems(items)) {
    for (const ref of extractBillRefs(item.text)) refs.add(ref);
  }
  return [...refs];
}

export function buildQuestionDrafts(input: {
  meetingKey: string;
  meetingName: string;
  representative?: { notice: ParsedNoticeList; url: string | null };
  general?: { notice: ParsedNoticeList; url: string | null };
  order?: { parsed: ParsedQuestionOrder; url: string | null };
}): { drafts: CouncilQuestionDraft[]; warnings: string[] } {
  const drafts: CouncilQuestionDraft[] = [];
  const warnings: string[] = [];
  const base = { meetingKey: input.meetingKey, meetingName: input.meetingName };

  for (const question of input.representative?.notice.questions ?? []) {
    drafts.push({
      ...base,
      listKind: "representative",
      kind: classifyRepresentativeKind(question.factionLabel),
      order: question.order,
      seatNumber: question.seatNumber,
      memberName: question.memberName,
      factionLabel: question.factionLabel,
      method: question.method,
      questionDate: null,
      noticeDate: input.representative?.notice.noticeDate ?? null,
      items: question.items,
      billRefs: collectBillRefs(question.items),
      sourceUrl: input.representative?.url ?? null,
    });
  }

  const orderRows = input.order?.parsed.rows ?? [];
  for (const question of input.general?.notice.questions ?? []) {
    const row = orderRows.find((r) => r.order === question.order);
    if (row && squeeze(row.memberName) !== squeeze(question.memberName)) {
      warnings.push(
        `一般質問 順位${question.order}：通告一覧（${question.memberName}）と順位表（${row.memberName}）の氏名が違います。予定日は入れていません`
      );
    }
    const sameMember =
      row && squeeze(row.memberName) === squeeze(question.memberName);
    drafts.push({
      ...base,
      listKind: "general",
      kind: "general",
      order: question.order,
      seatNumber: question.seatNumber,
      memberName: question.memberName,
      factionLabel: question.factionLabel,
      method: question.method ?? (sameMember ? row.method : null),
      questionDate: sameMember ? row.date : null,
      noticeDate: input.general?.notice.noticeDate ?? null,
      items: question.items,
      billRefs: collectBillRefs(question.items),
      sourceUrl: input.general?.url ?? null,
    });
  }
  if (
    input.general &&
    input.order &&
    orderRows.length !== input.general.notice.questions.length
  ) {
    warnings.push(
      `一般質問：通告一覧（${input.general.notice.questions.length} 人）と順位表（${orderRows.length} 人）の人数が違います`
    );
  }
  return { drafts, warnings };
}

/** 取込済みの質問（DB の行のうち、差分を決めるのに使う列） */
export type ExistingQuestion = {
  id: string;
  list_kind: "representative" | "general";
  order_no: number;
  is_published: boolean;
  operator_edited_at: string | null;
  site_snapshot: unknown;
};

export type QuestionImportPlan = {
  inserts: CouncilQuestionDraft[];
  /** 仮登録のままなので、公式の内容で置き換える */
  updates: { id: string; draft: CouncilQuestionDraft }[];
  /** 公開済み・運営者が手を入れた行は置き換えず、変わったことだけ知らせる */
  pending: { id: string; draft: CouncilQuestionDraft }[];
  /** 公式の一覧から消えた行。仮登録なら消し、公開済み・手を入れた行は知らせる */
  removed: { id: string; locked: boolean }[];
  unchanged: number;
};

/** キーの順番によらずに比べるための文字列（DB の jsonb はキーを並べ替えて返す） */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const sameJson = (a: unknown, b: unknown) =>
  stableStringify(a) === stableStringify(b);

export function planQuestionImport(
  drafts: CouncilQuestionDraft[],
  existing: ExistingQuestion[],
  importedLists: ("representative" | "general")[]
): QuestionImportPlan {
  const plan: QuestionImportPlan = {
    inserts: [],
    updates: [],
    pending: [],
    removed: [],
    unchanged: 0,
  };
  const keyOf = (listKind: string, order: number) => `${listKind}:${order}`;
  const byKey = new Map(
    existing.map((row) => [keyOf(row.list_kind, row.order_no), row])
  );
  const seen = new Set<string>();

  for (const draft of drafts) {
    const key = keyOf(draft.listKind, draft.order);
    seen.add(key);
    const row = byKey.get(key);
    if (!row) {
      plan.inserts.push(draft);
      continue;
    }
    if (sameJson(row.site_snapshot, snapshotOf(draft))) {
      plan.unchanged++;
      continue;
    }
    if (row.is_published || row.operator_edited_at) {
      plan.pending.push({ id: row.id, draft });
    } else {
      plan.updates.push({ id: row.id, draft });
    }
  }

  for (const row of existing) {
    if (!importedLists.includes(row.list_kind)) continue;
    if (seen.has(keyOf(row.list_kind, row.order_no))) continue;
    plan.removed.push({
      id: row.id,
      locked: row.is_published || Boolean(row.operator_edited_at),
    });
  }
  return plan;
}
