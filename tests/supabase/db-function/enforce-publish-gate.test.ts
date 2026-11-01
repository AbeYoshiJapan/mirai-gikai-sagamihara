import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "../utils";

/**
 * 公開ゲート（トリガー enforce_publish_gate）。
 * 議案を published にできるのは、レビュー完了かつ確認日時がある行だけ。
 */
describe("enforce_publish_gate", () => {
  const billIds: string[] = [];

  afterEach(async () => {
    for (const billId of billIds) {
      await cleanupTestBill(billId);
    }
    billIds.length = 0;
  });

  it("レビュー未完了の議案を published で作ることはできない", async () => {
    const { error } = await adminClient
      .from("bills")
      .insert({
        name: `ゲート ${Date.now()}`,
        status: "introduced",
        publish_status: "published",
        is_review_completed: false,
      })
      .select()
      .single();

    expect(error).not.toBeNull();
    expect(error?.message).toContain("publish gate");
  });

  it("確認日時が無い議案は published に変更できない", async () => {
    const bill = await createTestBill({ is_review_completed: true });
    billIds.push(bill.id);

    const { error } = await adminClient
      .from("bills")
      .update({ publish_status: "published" })
      .eq("id", bill.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("reviewed_at");
  });

  it("レビュー完了と確認日時がそろえば公開でき、published_at が記録される", async () => {
    const bill = await createTestBill();
    billIds.push(bill.id);

    const { error: reviewError } = await adminClient
      .from("bills")
      .update({
        is_review_completed: true,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", bill.id);
    expect(reviewError).toBeNull();

    const { data, error } = await adminClient
      .from("bills")
      .update({ publish_status: "published" })
      .eq("id", bill.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.publish_status).toBe("published");
    expect(data?.published_at).not.toBeNull();
  });

  it("レビュー完了を外すと確認者・確認日時も消える", async () => {
    const bill = await createTestBill({
      is_review_completed: true,
      reviewed_at: new Date().toISOString(),
    });
    billIds.push(bill.id);

    const { data, error } = await adminClient
      .from("bills")
      .update({ is_review_completed: false })
      .eq("id", bill.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.reviewed_at).toBeNull();
    expect(data?.reviewed_by).toBeNull();
  });

  it("公開済みの議案の他の列を更新してもゲートは邪魔しない", async () => {
    const bill = await createTestBill({ publish_status: "published" });
    billIds.push(bill.id);

    const { data, error } = await adminClient
      .from("bills")
      .update({ name: "改名した議案" })
      .eq("id", bill.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe("改名した議案");
    expect(data?.publish_status).toBe("published");
  });

  it("下書きに戻してから再公開するには、再び確認が必要", async () => {
    const bill = await createTestBill({ publish_status: "published" });
    billIds.push(bill.id);

    await adminClient
      .from("bills")
      .update({ publish_status: "draft", is_review_completed: false })
      .eq("id", bill.id);

    const { error } = await adminClient
      .from("bills")
      .update({ publish_status: "published" })
      .eq("id", bill.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("publish gate");
  });
});
