import {
  COUNCIL_QUESTION_KIND_ORDER,
  type CouncilQuestionKind,
  normalizeMemberName,
} from "@mirai-gikai/shared/council-questions/types";
import type { PublicCouncilQuestion } from "../types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 2026-12-15 → 12月15日（火） */
export function formatQuestionDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${weekday}）`;
}

/** 区分ごとに、公式の順位で並べる（代表質問 → 個人質疑 → 一般質問） */
export function groupQuestionsByKind(
  questions: PublicCouncilQuestion[]
): { kind: CouncilQuestionKind; questions: PublicCouncilQuestion[] }[] {
  return COUNCIL_QUESTION_KIND_ORDER.map((kind) => ({
    kind,
    questions: questions
      .filter((q) => q.kind === kind)
      .sort((a, b) => a.order_no - b.order_no),
  })).filter((group) => group.questions.length > 0);
}

/** 一般質問を質問日ごとに分ける（日が決まっていないものは最後） */
export function groupQuestionsByDate(
  questions: PublicCouncilQuestion[]
): { date: string | null; questions: PublicCouncilQuestion[] }[] {
  const groups = new Map<string, PublicCouncilQuestion[]>();
  for (const question of [...questions].sort(
    (a, b) => a.order_no - b.order_no
  )) {
    const key = question.question_date ?? "";
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([date, list]) => ({ date: date || null, questions: list }));
}

/** 運営者本人の質問か（サイト設定の「議会での氏名」と比べる。空なら誰も運営者にしない） */
export function isOperatorQuestion(
  question: Pick<PublicCouncilQuestion, "member_name">,
  nameInCouncil: string
): boolean {
  const name = normalizeMemberName(nameInCouncil);
  return name !== "" && normalizeMemberName(question.member_name) === name;
}
