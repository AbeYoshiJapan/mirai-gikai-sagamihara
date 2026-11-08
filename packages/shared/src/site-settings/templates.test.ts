import { describe, expect, it } from "vitest";
import {
  SAGAMIHARA_NAME_NOTE_MD,
  SAGAMIHARA_SESSION_SYSTEM_MD,
} from "./presets/sagamihara";
import {
  DEFAULT_EDITORIAL_POLICY_MD,
  DEFAULT_INTERVIEW_CONSENT_MD,
  DEFAULT_OPERATOR_DISCLAIMER_MD,
  DEFAULT_PETITION_GUIDE_MD,
  DEFAULT_TERMS_MD,
} from "./templates";

describe("既定の文での運営者の書き方", () => {
  it("確認・回答・活用などをする人は、名前を添えず「運営者」と書く", () => {
    for (const text of [
      DEFAULT_EDITORIAL_POLICY_MD,
      DEFAULT_INTERVIEW_CONSENT_MD,
      DEFAULT_PETITION_GUIDE_MD,
      SAGAMIHARA_SESSION_SYSTEM_MD,
      SAGAMIHARA_NAME_NOTE_MD,
    ]) {
      expect(text).not.toContain("{{operator_name}}");
      expect(text).toContain("運営者");
    }
  });

  it("運営者がだれかを示す文（規約の定義・公式サイトではない旨）には名前を入れる", () => {
    expect(DEFAULT_TERMS_MD).toContain(
      "{{operator_title}}の{{operator_name}}（以下「運営者」といいます。）"
    );
    expect(DEFAULT_OPERATOR_DISCLAIMER_MD).toContain(
      "{{operator_title}}の{{operator_name}}が個人で運営しています"
    );
  });
});
