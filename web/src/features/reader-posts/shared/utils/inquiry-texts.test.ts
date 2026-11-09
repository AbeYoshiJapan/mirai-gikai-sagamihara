import { READER_QUESTION_KINDS } from "@mirai-gikai/shared/reader-posts/labels";
import { describe, expect, it } from "vitest";
import { INQUIRY_KIND_TEXTS } from "./inquiry-texts";

describe("INQUIRY_KIND_TEXTS", () => {
  it("質問・意見のどちらにも、公開は運営者の確認のうえだと伝える同意の文がある", () => {
    for (const kind of READER_QUESTION_KINDS) {
      const texts = INQUIRY_KIND_TEXTS[kind];
      expect(texts.consent).toContain("運営者の確認のうえで");
      expect(texts.consent).toContain("公開してよい");
      expect(texts.thanks).toContain("運営者が内容を確認");
    }
  });

  it("意見は「Q.」「A.」ではなく、意見と返事として示す", () => {
    expect(INQUIRY_KIND_TEXTS.opinion.postMark).toBe("意見");
    expect(INQUIRY_KIND_TEXTS.opinion.replyMark).toBe("返事");
    expect(INQUIRY_KIND_TEXTS.question.postMark).toBe("Q.");
  });
});
