import { describe, expect, it } from "vitest";
import {
  buildAdminReaderOpinionsUrl,
  buildAdminReaderQuestionsUrl,
  buildReaderOpinionSlackMessage,
  buildReaderQuestionSlackMessage,
  SLACK_BODY_PREVIEW_LENGTH,
} from "./build-reader-post-slack-message";

describe("buildAdminReaderOpinionsUrl / buildAdminReaderQuestionsUrl", () => {
  it("末尾のスラッシュを重ねない", () => {
    expect(buildAdminReaderOpinionsUrl("https://admin.example.com/")).toBe(
      "https://admin.example.com/reader-opinions"
    );
    expect(buildAdminReaderQuestionsUrl("https://admin.example.com")).toBe(
      "https://admin.example.com/reader-questions"
    );
  });
});

describe("buildReaderOpinionSlackMessage", () => {
  it("議案名・賛否・同意の有無・本文を含み、未公開であることを示す", () => {
    const text = buildReaderOpinionSlackMessage({
      billName: "保育所条例",
      stance: "against",
      consentToPublish: true,
      body: "負担が増える\n反対です",
      adminInboxUrl: "https://admin.example.com/reader-opinions",
    });
    expect(text).toContain("未公開");
    expect(text).toContain("議案: 保育所条例");
    expect(text).toContain("賛否: 反対");
    expect(text).toContain("公開の同意: あり");
    expect(text).toContain("> 負担が増える\n> 反対です");
  });

  it("Slack の制御文字をエスケープし、長い本文は切り詰める", () => {
    const text = buildReaderOpinionSlackMessage({
      billName: "<a&b>",
      stance: "for",
      consentToPublish: false,
      body: "あ".repeat(SLACK_BODY_PREVIEW_LENGTH + 10),
      adminInboxUrl: "https://admin.example.com/reader-opinions",
    });
    expect(text).toContain("議案: &lt;a&amp;b&gt;");
    expect(text).toContain(`> ${"あ".repeat(SLACK_BODY_PREVIEW_LENGTH)}…`);
    expect(text).toContain("公開の同意: なし");
  });
});

describe("buildReaderQuestionSlackMessage", () => {
  it("議案に紐づかない質問はその旨を出す", () => {
    const text = buildReaderQuestionSlackMessage({
      billName: null,
      hasContact: true,
      body: "議会はいつ開かれますか",
      adminInboxUrl: "https://admin.example.com/reader-questions",
    });
    expect(text).toContain("議案: （議案に紐づかない質問）");
    expect(text).toContain("連絡先: あり");
    expect(text).toContain("> 議会はいつ開かれますか");
  });

  it("意見として届いたものは、意見と分かるように知らせる", () => {
    const text = buildReaderQuestionSlackMessage({
      kind: "opinion",
      billName: null,
      hasContact: false,
      body: "傍聴席をもっと増やしてほしい",
      adminInboxUrl: "https://admin.example.com/reader-questions",
    });
    expect(text.split("\n")[0]).toBe("意見が届きました（未返信）");
    expect(text).toContain("議案: （議案に紐づかない意見）");
  });
});
