import { adminClient } from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  findPublicThemeById,
  findPublicThemes,
  findPublishedQuestionById,
  findPublishedQuestionMeetings,
  findPublishedQuestionsByBillRef,
  findPublishedQuestionsByMeeting,
  findPublishedQuestionsByMember,
  findThemeQuestionItems,
  findThemesForQuestions,
} from "./council-question-repository";

// ほかのテストのデータと重ならない年の定例会議
const YEAR = 2090 + (Date.now() % 9);
const MEETING = `${YEAR}-12`;
const SUFFIX = String(Date.now());
const MEMBER = `公開テスト${SUFFIX}`;

const ITEMS = [
  { label: "1", level: 1, text: "議案第９９号について", children: [] },
  { label: "2", level: 1, text: "防災の取組について", children: [] },
];

describe("議会での質問（公開サイト）：確認して公開した質問と、テーマとして公開したタグだけを出す", () => {
  let publishedId: string;
  let draftId: string;
  let themeId: string;
  let plainTagId: string;

  beforeAll(async () => {
    const { data: questions, error } = await adminClient
      .from("council_questions")
      .insert([
        {
          meeting_key: MEETING,
          meeting_name: "テスト定例会議",
          list_kind: "general",
          kind: "general",
          order_no: 1,
          member_name: MEMBER,
          items: ITEMS,
          bill_refs: ["議案第99号"],
          is_published: true,
          confirmed_at: new Date().toISOString(),
        },
        {
          meeting_key: MEETING,
          meeting_name: "テスト定例会議",
          list_kind: "general",
          kind: "general",
          order_no: 2,
          member_name: MEMBER,
          items: ITEMS,
          bill_refs: ["議案第99号"],
          is_published: false,
        },
      ])
      .select("id, order_no");
    if (error || !questions)
      throw new Error(`質問の作成失敗: ${error?.message}`);
    publishedId = questions.find((q) => q.order_no === 1)?.id ?? "";
    draftId = questions.find((q) => q.order_no === 2)?.id ?? "";

    const { data: tags, error: tagError } = await adminClient
      .from("tags")
      .insert([
        { label: `防災テーマ${SUFFIX}`, is_theme: true, theme_order: 1 },
        { label: `ただのタグ${SUFFIX}`, is_theme: false, theme_order: 0 },
      ])
      .select("id, is_theme");
    if (tagError || !tags)
      throw new Error(`タグの作成失敗: ${tagError?.message}`);
    themeId = tags.find((tag) => tag.is_theme)?.id ?? "";
    plainTagId = tags.find((tag) => !tag.is_theme)?.id ?? "";

    const { error: linkError } = await adminClient
      .from("council_question_themes")
      .insert([
        { question_id: publishedId, item_number: 2, tag_id: themeId },
        { question_id: publishedId, item_number: 1, tag_id: plainTagId },
        { question_id: draftId, item_number: 2, tag_id: themeId },
      ]);
    if (linkError) throw new Error(`ひも付けの作成失敗: ${linkError.message}`);
  });

  afterAll(async () => {
    await adminClient
      .from("council_questions")
      .delete()
      .in("id", [publishedId, draftId].filter(Boolean));
    await adminClient
      .from("tags")
      .delete()
      .in("id", [themeId, plainTagId].filter(Boolean));
  });

  it("定例会議・議員ごとの質問は、公開中のものだけ", async () => {
    const questions = await findPublishedQuestionsByMeeting(MEETING);
    expect(questions.map((q) => q.id)).toEqual([publishedId]);
    expect(questions[0].items.map((item) => item.label)).toEqual(["1", "2"]);

    const meetings = await findPublishedQuestionMeetings();
    expect(meetings.find((m) => m.meeting_key === MEETING)?.count).toBe(1);

    expect(
      (await findPublishedQuestionsByMember(MEMBER)).map((q) => q.id)
    ).toEqual([publishedId]);
    expect(await findPublishedQuestionById(draftId)).toBeNull();
  });

  it("議案の番号が通告に出てくる質問は、その年の公開中のものだけ", async () => {
    expect(
      (await findPublishedQuestionsByBillRef(YEAR, "議案第99号")).map(
        (q) => q.id
      )
    ).toEqual([publishedId]);
    expect(await findPublishedQuestionsByBillRef(YEAR, "議案第9号")).toEqual(
      []
    );
  });

  it("テーマはテーマとして公開したタグだけ。質問の数は公開中の質問だけ数える", async () => {
    const themes = await findPublicThemes();
    expect(themes.find((t) => t.id === themeId)).toMatchObject({
      label: `防災テーマ${SUFFIX}`,
      questionCount: 1,
    });
    expect(themes.some((t) => t.id === plainTagId)).toBe(false);
    expect(await findPublicThemeById(plainTagId)).toBeNull();

    expect(await findThemesForQuestions([publishedId])).toEqual([
      {
        question_id: publishedId,
        item_number: 2,
        theme: { id: themeId, label: `防災テーマ${SUFFIX}`, description: null },
      },
    ]);
    expect(
      (await findThemeQuestionItems(themeId)).map((item) => [
        item.question.id,
        item.itemNumber,
      ])
    ).toEqual([[publishedId, 2]]);
  });
});
