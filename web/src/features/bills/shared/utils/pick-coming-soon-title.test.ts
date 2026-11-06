import { describe, expect, it } from "vitest";
import { pickComingSoonTitle } from "./pick-coming-soon-title";

const contents = [
  { title: "ふつうの見出し", difficulty_level: "normal" },
  { title: "くわしい見出し", difficulty_level: "hard" },
];

describe("pickComingSoonTitle", () => {
  it("運営者の確認が済んでいない議案は、見出しを出さない（正式名称だけにする）", () => {
    expect(pickComingSoonTitle(contents, "normal", false)).toBeNull();
  });

  it("確認済みなら、利用者が選んだ難易度の見出しを使う", () => {
    expect(pickComingSoonTitle(contents, "hard", true)).toBe("くわしい見出し");
  });

  it("選んだ難易度の見出しがなければ「ふつう」を使う", () => {
    expect(
      pickComingSoonTitle(
        [{ title: "ふつうの見出し", difficulty_level: "normal" }],
        "hard",
        true
      )
    ).toBe("ふつうの見出し");
  });

  it("「ふつう」もなければ最初の見出しを使う", () => {
    expect(
      pickComingSoonTitle(
        [{ title: "くわしい見出し", difficulty_level: "hard" }],
        "normal",
        true
      )
    ).toBe("くわしい見出し");
  });

  it("見出しが空・解説がないときは null", () => {
    expect(
      pickComingSoonTitle(
        [{ title: "", difficulty_level: "normal" }],
        "normal",
        true
      )
    ).toBeNull();
    expect(pickComingSoonTitle([], "normal", true)).toBeNull();
    expect(pickComingSoonTitle(null, "normal", true)).toBeNull();
  });
});
