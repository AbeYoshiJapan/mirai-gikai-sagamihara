import { describe, expect, it } from "vitest";
import { buildPostRecipientNotice } from "./post-recipient-notice";

describe("buildPostRecipientNotice", () => {
  it("送り先として運営者の名前を示し、対応するのは運営者だと伝える", () => {
    expect(buildPostRecipientNotice("阿部善博")).toBe(
      "意見や質問は、運営者である阿部善博に届き、運営者が対応します。あらかじめご了承ください。"
    );
  });

  it("名前が未設定なら「運営者」とだけ書く", () => {
    expect(buildPostRecipientNotice("  ")).toBe(
      "意見や質問は、運営者に届き、運営者が対応します。あらかじめご了承ください。"
    );
  });
});
