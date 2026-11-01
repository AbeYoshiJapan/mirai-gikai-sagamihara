import { describe, expect, it } from "vitest";
import {
  appendSourcesBlock,
  buildBillExplanationPrompt,
  buildSourcesBlock,
  MAX_SOURCE_TEXT_CHARS,
} from "./prompt";
import {
  countUnresolvedReviewPoints,
  parseStoredExplanation,
  toStoredExplanation,
} from "./schema";

const context = {
  council_name: "相模原市議会",
  municipality: "相模原市",
  resident_label: "市民",
  session_label: "定例会議",
  primary_source_label: "相模原市議会の議案書・会議録",
};

const bill = {
  name: "相模原市学校給食費無償化条例",
  bill_number: "議案第40号",
  kind_label: "条例",
  proposer_label: "市長提出",
  committee_name: "こども文教委員会",
  submitted_date: "2025-11-27",
  status_note: null,
};

describe("buildBillExplanationPrompt", () => {
  it("議会名・住民呼称・既存タグを指示文に差し込み、資料はナンス付きの区切りで囲む", () => {
    const { system, user } = buildBillExplanationPrompt({
      bill,
      sources: [
        {
          kind_label: "議案書",
          label: "議案書（12月定例会議）",
          url: "https://example.jp/bill.pdf",
          meeting_date: null,
          text: "第1条 この条例は…",
        },
      ],
      extra_text: null,
      existing_tags: ["子育て・教育", "財政"],
      context,
      nonce: "NONCE",
    });

    expect(system).toContain("相模原市議会の議案を、相模原市の市民向け");
    expect(system).toContain("子育て・教育、財政");
    expect(system).toContain("氏名・会派名は書かない");
    expect(user).toContain("議案番号: 議案第40号");
    expect(user).toContain("<<<UNTRUSTED_CONTENT_NONCE>>>");
    expect(user).toContain("第1条 この条例は…");
  });

  it("本文の無い資料はリンクだけ、貼り付けた資料は別ブロックで渡す", () => {
    const { user } = buildBillExplanationPrompt({
      bill,
      sources: [
        {
          kind_label: "中継・録画",
          label: "",
          url: "https://example.jp/video",
          meeting_date: "2025-12-19",
          text: null,
        },
      ],
      extra_text: "提案理由: 子育て世帯の負担軽減のため",
      existing_tags: [],
      context,
      nonce: "NONCE",
    });
    expect(user).toContain("本文は未取得。リンクのみ: https://example.jp/video");
    expect(user).toContain("### 管理者が貼り付けた資料\n提案理由");
  });

  it("資料の本文は上限で切り、切ったことを伝える", () => {
    const { user } = buildBillExplanationPrompt({
      bill,
      sources: [
        {
          kind_label: "会議録",
          label: "本会議",
          url: "https://example.jp/m",
          meeting_date: null,
          text: "あ".repeat(MAX_SOURCE_TEXT_CHARS + 100),
        },
      ],
      extra_text: null,
      existing_tags: [],
      context,
      nonce: "NONCE",
    });
    expect(user).toContain("この資料は長いため途中までです");
    expect(user.length).toBeLessThan(MAX_SOURCE_TEXT_CHARS + 2000);
  });
});

describe("buildSourcesBlock / appendSourcesBlock", () => {
  it("登録済みの資料をリンク付きで並べ、本文に一度だけ付ける", () => {
    const block = buildSourcesBlock(
      [
        {
          kind_label: "議案書",
          label: "",
          url: "https://example.jp/a.pdf",
          meeting_date: null,
        },
        {
          kind_label: "会議録",
          label: "総務委員会",
          url: "https://example.jp/b",
          meeting_date: "2026-09-05",
        },
      ],
      "一次資料"
    );
    expect(block).toBe(
      "## 出典\n\n- [議案書](https://example.jp/a.pdf)\n- [総務委員会（2026-09-05）](https://example.jp/b)"
    );
    const once = appendSourcesBlock("## 内容\n\n本文", block);
    expect(once.endsWith(`${block}\n`)).toBe(true);
    expect(appendSourcesBlock(once, block)).toBe(once.trimEnd());
  });

  it("資料が無ければ一次資料の総称だけ", () => {
    expect(buildSourcesBlock([], "相模原市議会の議案書・会議録")).toContain(
      "- 相模原市議会の議案書・会議録"
    );
  });
});

describe("stored explanation", () => {
  it("要確認は未解決で保存され、解決数を数えられる", () => {
    const stored = toStoredExplanation(
      {
        normal: { title: "t", summary: "s", content: "c" },
        hard: { title: "t", summary: "s", content: "c" },
        tag_suggestions: [],
        glossary_suggestions: [],
        needs_review: [{ location: "背景", reason: "施行日が読めない" }],
      },
      "## 出典\n\n- x"
    );
    expect(stored.needs_review[0].resolved).toBe(false);
    expect(countUnresolvedReviewPoints(stored)).toBe(1);

    const parsed = parseStoredExplanation({
      ...stored,
      needs_review: [{ ...stored.needs_review[0], resolved: true }],
    });
    expect(countUnresolvedReviewPoints(parsed)).toBe(0);
    expect(parseStoredExplanation({ broken: true })).toBeNull();
  });
});
