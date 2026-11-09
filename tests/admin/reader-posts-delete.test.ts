import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteReaderOpinionById } from "../../admin/src/features/reader-posts/server/repositories/reader-opinion-repository";
import { deleteReaderQuestionById } from "../../admin/src/features/reader-posts/server/repositories/reader-question-repository";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
} from "../supabase/utils";

describe("意見・質問の削除", () => {
  let billId: string;

  beforeAll(async () => {
    const bill = await createTestBill();
    billId = bill.id;
  });

  afterAll(async () => {
    await cleanupTestBill(billId);
  });

  it("質問（窓から届いた意見を含む）を消すと、行がなくなり、消す前の状態が返る", async () => {
    const { data, error } = await adminClient
      .from("reader_questions")
      .insert({
        body: "スパムの例",
        kind: "opinion",
        status: "answered",
        answer_md: "返事",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    const id = data?.id as string;

    await expect(deleteReaderQuestionById(id)).resolves.toEqual({
      status: "answered",
    });
    const { data: after } = await adminClient
      .from("reader_questions")
      .select("id")
      .eq("id", id);
    expect(after).toEqual([]);

    // もう一度消そうとしても、見つからないだけ
    await expect(deleteReaderQuestionById(id)).resolves.toBeNull();
  });

  it("公開中の議案への意見も消せ、公開中だったことが返る", async () => {
    const { data, error } = await adminClient
      .from("reader_opinions")
      .insert({
        bill_id: billId,
        stance: "for",
        body: "広告の例",
        consent_to_publish: true,
        status: "published",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    const id = data?.id as string;

    await expect(deleteReaderOpinionById(id)).resolves.toEqual({
      status: "published",
    });
    const { data: after } = await adminClient
      .from("reader_opinions")
      .select("id")
      .eq("id", id);
    expect(after).toEqual([]);
  });
});
