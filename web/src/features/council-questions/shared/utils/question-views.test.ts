import { describe, expect, it } from "vitest";
import type { PublicCouncilQuestion } from "../types";
import {
  formatQuestionDate,
  groupQuestionsByDate,
  groupQuestionsByKind,
  isOperatorQuestion,
} from "./question-views";

const question = (
  over: Partial<PublicCouncilQuestion>
): PublicCouncilQuestion => ({
  id: "id",
  meeting_key: "2026-12",
  meeting_name: "令和8年12月定例会議",
  kind: "general",
  order_no: 1,
  seat_number: null,
  member_name: "議員",
  faction_label: "",
  method: null,
  question_date: null,
  items: [],
  bill_refs: [],
  source_url: null,
  stream_url: null,
  minutes_url: null,
  confirmed_at: null,
  ...over,
});

describe("question-views", () => {
  it("質問日を曜日つきで出す", () => {
    expect(formatQuestionDate("2026-12-15")).toBe("12月15日（火）");
  });

  it("区分ごとに公式の順位で並べる（代表質問が先）", () => {
    const groups = groupQuestionsByKind([
      question({ id: "g2", order_no: 2 }),
      question({ id: "r1", kind: "representative", order_no: 1 }),
      question({ id: "g1", order_no: 1 }),
      question({ id: "i7", kind: "individual", order_no: 7 }),
    ]);
    expect(groups.map((g) => [g.kind, g.questions.map((q) => q.id)])).toEqual([
      ["representative", ["r1"]],
      ["individual", ["i7"]],
      ["general", ["g1", "g2"]],
    ]);
  });

  it("一般質問を質問日ごとに分け、日が決まっていないものは最後", () => {
    const groups = groupQuestionsByDate([
      question({ id: "b", order_no: 9, question_date: "2026-12-16" }),
      question({ id: "x", order_no: 21, question_date: null }),
      question({ id: "a", order_no: 1, question_date: "2026-12-15" }),
    ]);
    expect(groups.map((g) => [g.date, g.questions.map((q) => q.id)])).toEqual([
      ["2026-12-15", ["a"]],
      ["2026-12-16", ["b"]],
      [null, ["x"]],
    ]);
  });

  it("運営者本人の質問は、設定の氏名と空白を除いて比べる。設定が空なら誰も運営者にしない", () => {
    expect(isOperatorQuestion({ member_name: "阿部善博" }, "阿部　善博")).toBe(
      true
    );
    expect(isOperatorQuestion({ member_name: "務川慧" }, "阿部善博")).toBe(
      false
    );
    expect(isOperatorQuestion({ member_name: "阿部善博" }, "")).toBe(false);
  });
});
