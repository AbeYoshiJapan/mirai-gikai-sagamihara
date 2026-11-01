import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "../utils";

/**
 * 意見・質問フォームの投稿（reader_opinions / reader_questions）。
 * 投稿は既定で非公開。公開に同意のない投稿・回答のない質問は DB 制約で公開できず、
 * status に合わせて published_at / reviewed_at / answered_at がトリガーで揃う。
 */
describe("reader_opinions / reader_questions", () => {
  const billIds: string[] = [];
  const questionIds: string[] = [];

  afterEach(async () => {
    if (questionIds.length > 0) {
      await adminClient.from("reader_questions").delete().in("id", questionIds);
      questionIds.length = 0;
    }
    for (const billId of billIds) {
      await cleanupTestBill(billId);
    }
    billIds.length = 0;
  });

  async function createBill() {
    const bill = await createTestBill({ publish_status: "published" });
    billIds.push(bill.id);
    return bill;
  }

  describe("reader_opinions", () => {
    it("投稿は既定で非公開（received）になる", async () => {
      const bill = await createBill();
      const { data, error } = await adminClient
        .from("reader_opinions")
        .insert({ bill_id: bill.id, stance: "for", body: "賛成です" })
        .select("status, consent_to_publish, published_at, reviewed_at")
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        status: "received",
        consent_to_publish: false,
        published_at: null,
        reviewed_at: null,
      });
    });

    it("公開に同意のない意見は公開できない", async () => {
      const bill = await createBill();
      const { data: opinion } = await adminClient
        .from("reader_opinions")
        .insert({ bill_id: bill.id, stance: "for", body: "賛成です" })
        .select("id")
        .single();

      const { error } = await adminClient
        .from("reader_opinions")
        .update({ status: "published" })
        .eq("id", opinion?.id ?? "");

      expect(error?.message).toContain(
        "reader_opinions_publish_requires_consent"
      );
    });

    it("同意があれば公開でき、未対応に戻すと公開日時と確認記録が消える", async () => {
      const bill = await createBill();
      const { data: opinion } = await adminClient
        .from("reader_opinions")
        .insert({
          bill_id: bill.id,
          stance: "against",
          body: "反対です",
          consent_to_publish: true,
        })
        .select("id")
        .single();
      const id = opinion?.id ?? "";

      const { data: published, error } = await adminClient
        .from("reader_opinions")
        .update({ status: "published" })
        .eq("id", id)
        .select("published_at, reviewed_at")
        .single();
      expect(error).toBeNull();
      expect(published?.published_at).not.toBeNull();
      expect(published?.reviewed_at).not.toBeNull();

      const { data: reverted } = await adminClient
        .from("reader_opinions")
        .update({ status: "received" })
        .eq("id", id)
        .select("published_at, reviewed_at, reviewed_by")
        .single();
      expect(reverted).toEqual({
        published_at: null,
        reviewed_at: null,
        reviewed_by: null,
      });
    });

    it("議案を削除すると意見も消える", async () => {
      const bill = await createBill();
      await adminClient
        .from("reader_opinions")
        .insert({ bill_id: bill.id, stance: "neutral", body: "どちらとも" });
      await cleanupTestBill(bill.id);
      billIds.splice(billIds.indexOf(bill.id), 1);

      const { data } = await adminClient
        .from("reader_opinions")
        .select("id")
        .eq("bill_id", bill.id);
      expect(data).toEqual([]);
    });
  });

  describe("reader_questions", () => {
    it("議案に紐づかない質問を受け付け、既定は未回答", async () => {
      const { data, error } = await adminClient
        .from("reader_questions")
        .insert({ body: "議会はいつ開かれますか" })
        .select("id, status, bill_id, answer_md")
        .single();
      if (data) questionIds.push(data.id);

      expect(error).toBeNull();
      expect(data).toMatchObject({
        status: "received",
        bill_id: null,
        answer_md: "",
      });
    });

    it("回答のない質問・同意のない質問は公開できない", async () => {
      const { data: question } = await adminClient
        .from("reader_questions")
        .insert({ body: "質問", consent_to_publish: true })
        .select("id")
        .single();
      const id = question?.id ?? "";
      questionIds.push(id);

      const noAnswer = await adminClient
        .from("reader_questions")
        .update({ status: "published" })
        .eq("id", id);
      expect(noAnswer.error?.message).toContain(
        "reader_questions_publish_requires_answer"
      );

      const noConsent = await adminClient
        .from("reader_questions")
        .update({
          status: "published",
          answer_md: "回答",
          consent_to_publish: false,
        })
        .eq("id", id);
      expect(noConsent.error?.message).toContain(
        "reader_questions_publish_requires_consent"
      );
    });

    it("回答を付けて公開すると answered_at / published_at が入る", async () => {
      const { data: question } = await adminClient
        .from("reader_questions")
        .insert({ body: "質問", consent_to_publish: true })
        .select("id")
        .single();
      const id = question?.id ?? "";
      questionIds.push(id);

      const { data, error } = await adminClient
        .from("reader_questions")
        .update({ status: "published", answer_md: "回答です" })
        .eq("id", id)
        .select("answered_at, published_at")
        .single();
      expect(error).toBeNull();
      expect(data?.answered_at).not.toBeNull();
      expect(data?.published_at).not.toBeNull();
    });

    it("議案を削除しても質問は残り、bill_id が null になる", async () => {
      const bill = await createBill();
      const { data: question } = await adminClient
        .from("reader_questions")
        .insert({ bill_id: bill.id, body: "議案の質問" })
        .select("id")
        .single();
      const id = question?.id ?? "";
      questionIds.push(id);

      await cleanupTestBill(bill.id);
      billIds.splice(billIds.indexOf(bill.id), 1);

      const { data } = await adminClient
        .from("reader_questions")
        .select("bill_id")
        .eq("id", id)
        .single();
      expect(data?.bill_id).toBeNull();
    });
  });
});
