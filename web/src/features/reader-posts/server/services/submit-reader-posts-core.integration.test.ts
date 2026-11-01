import {
  adminClient,
  cleanupTestBill,
  createTestBill,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type SubmitReaderPostDeps,
  submitReaderOpinionCore,
} from "./submit-reader-opinion-core";
import { submitReaderQuestionCore } from "./submit-reader-question-core";

describe("意見・質問フォーム 統合テスト", () => {
  const billIds: string[] = [];
  let baseDeps: SubmitReaderPostDeps;

  // 全体枠を他のテストや実運用のキーと共有しないよう、毎回別のキーを使う
  beforeEach(() => {
    baseDeps = {
      clientIp: "203.0.113.1",
      now: new Date(),
      adminUrl: "https://admin.example.com",
      ipHashSalt: "test-salt",
      rateLimitKeyPrefix: `test-reader-post-${crypto.randomUUID()}`,
    };
  });

  afterEach(async () => {
    for (const id of billIds) {
      await adminClient.from("reader_questions").delete().eq("bill_id", id);
      await cleanupTestBill(id);
    }
    billIds.length = 0;
  });

  async function createBill(
    overrides: Parameters<typeof createTestBill>[0] = {}
  ) {
    const bill = await createTestBill({
      publish_status: "published",
      ...overrides,
    });
    billIds.push(bill.id);
    return bill;
  }

  async function findOpinions(billId: string) {
    const { data, error } = await adminClient
      .from("reader_opinions")
      .select("*")
      .eq("bill_id", billId);
    if (error) throw new Error(error.message);
    return data;
  }

  async function findQuestions(billId: string) {
    const { data, error } = await adminClient
      .from("reader_questions")
      .select("*")
      .eq("bill_id", billId);
    if (error) throw new Error(error.message);
    return data;
  }

  describe("submitReaderOpinionCore", () => {
    it("意見を非公開（received）で保存し、Slack に通知する", async () => {
      const bill = await createBill({ name: "通知テスト議案" });
      const notified: string[] = [];

      const result = await submitReaderOpinionCore(
        {
          billId: bill.id,
          stance: "for",
          body: "  賛成です  ",
          displayName: "さがみ",
          residence: "inside",
          ageGroup: "40s",
          consentToPublish: true,
        },
        {
          ...baseDeps,
          notify: async (text) => {
            notified.push(text);
          },
        }
      );

      expect(result).toEqual({ ok: true });
      const opinions = await findOpinions(bill.id);
      expect(opinions).toHaveLength(1);
      expect(opinions[0]).toMatchObject({
        stance: "for",
        body: "賛成です",
        display_name: "さがみ",
        attributes: { residence: "inside", age_group: "40s" },
        consent_to_publish: true,
        status: "received",
        published_at: null,
      });
      // 生の IP は保存しない
      expect(opinions[0]?.ip_hash).not.toBeNull();
      expect(opinions[0]?.ip_hash).not.toContain("203.0.113.1");
      expect(notified).toHaveLength(1);
      expect(notified[0]).toContain("議案: 通知テスト議案");
      expect(notified[0]).toContain(
        "https://admin.example.com/reader-opinions"
      );
    });

    it("salt が無ければ ip_hash を保存しない", async () => {
      const bill = await createBill();
      const result = await submitReaderOpinionCore(
        { billId: bill.id, stance: "unsure", body: "よくわからない" },
        { ...baseDeps, ipHashSalt: undefined }
      );
      expect(result).toEqual({ ok: true });
      const opinions = await findOpinions(bill.id);
      expect(opinions[0]?.ip_hash).toBeNull();
      expect(opinions[0]?.consent_to_publish).toBe(false);
    });

    it("非公開の議案への意見は受け付けない", async () => {
      const bill = await createBill({ publish_status: "draft" });
      const result = await submitReaderOpinionCore(
        { billId: bill.id, stance: "for", body: "賛成" },
        baseDeps
      );
      expect(result.ok).toBe(false);
      expect(await findOpinions(bill.id)).toHaveLength(0);
    });

    it("同じ IP から短時間に 6 件目は受け付けない", async () => {
      const bill = await createBill();
      for (let i = 0; i < 5; i++) {
        const result = await submitReaderOpinionCore(
          { billId: bill.id, stance: "neutral", body: `意見 ${i}` },
          baseDeps
        );
        expect(result).toEqual({ ok: true });
      }
      const sixth = await submitReaderOpinionCore(
        { billId: bill.id, stance: "neutral", body: "6件目" },
        baseDeps
      );
      expect(sixth.ok).toBe(false);
      expect(await findOpinions(bill.id)).toHaveLength(5);
    });

    it("公開に同意していない意見は DB 制約で公開できない", async () => {
      const bill = await createBill();
      await submitReaderOpinionCore(
        {
          billId: bill.id,
          stance: "for",
          body: "賛成",
          consentToPublish: false,
        },
        baseDeps
      );
      const [opinion] = await findOpinions(bill.id);
      const { error } = await adminClient
        .from("reader_opinions")
        .update({ status: "published" })
        .eq("id", opinion.id);
      expect(error?.message).toContain(
        "reader_opinions_publish_requires_consent"
      );
    });
  });

  describe("submitReaderQuestionCore", () => {
    it("質問を非公開（received）で保存し、連絡先は本文と分けて持つ", async () => {
      const bill = await createBill({ name: "質問テスト議案" });
      const notified: string[] = [];

      const result = await submitReaderQuestionCore(
        {
          billId: bill.id,
          body: "いつから施行されますか",
          contact: "a@example.com",
          consentToPublish: true,
        },
        {
          ...baseDeps,
          notify: async (text) => {
            notified.push(text);
          },
        }
      );

      expect(result).toEqual({ ok: true });
      const questions = await findQuestions(bill.id);
      expect(questions).toHaveLength(1);
      expect(questions[0]).toMatchObject({
        body: "いつから施行されますか",
        contact: "a@example.com",
        consent_to_publish: true,
        status: "received",
        answer_md: "",
      });
      expect(notified[0]).toContain("議案: 質問テスト議案");
      expect(notified[0]).toContain("連絡先: あり");
      // 連絡先そのものは通知に載せない
      expect(notified[0]).not.toContain("a@example.com");
    });

    it("議案に紐づかない一般の質問を受け付ける", async () => {
      const result = await submitReaderQuestionCore(
        { body: "議会はいつ開かれますか" },
        baseDeps
      );
      expect(result).toEqual({ ok: true });
      const { data } = await adminClient
        .from("reader_questions")
        .select("id, bill_id")
        .is("bill_id", null)
        .eq("body", "議会はいつ開かれますか");
      expect(data?.length).toBeGreaterThan(0);
      await adminClient
        .from("reader_questions")
        .delete()
        .eq("body", "議会はいつ開かれますか");
    });

    it("回答のない質問は DB 制約で公開できない", async () => {
      const bill = await createBill();
      await submitReaderQuestionCore(
        { billId: bill.id, body: "質問", consentToPublish: true },
        baseDeps
      );
      const [question] = await findQuestions(bill.id);
      const { error } = await adminClient
        .from("reader_questions")
        .update({ status: "published" })
        .eq("id", question.id);
      expect(error?.message).toContain(
        "reader_questions_publish_requires_answer"
      );
    });
  });
});
