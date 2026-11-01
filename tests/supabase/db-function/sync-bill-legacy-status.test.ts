import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "../utils";

/**
 * status（国会由来）と bill_kind／stage／result を同期するトリガー sync_bill_legacy_status。
 */
describe("sync_bill_legacy_status", () => {
  const billIds: string[] = [];

  afterEach(async () => {
    for (const billId of billIds) {
      await cleanupTestBill(billId);
    }
    billIds.length = 0;
  });

  it("status だけで作ると stage／result が導出される", async () => {
    const bill = await createTestBill({ status: "enacted" });
    billIds.push(bill.id);

    expect(bill.stage).toBe("decided");
    expect(bill.result).toBe("passed");
    expect(bill.bill_kind).toBe("other");
  });

  it("旧来の reported は bill_kind = report になり stage は持たない", async () => {
    const { data, error } = await adminClient
      .from("bills")
      .insert({ name: `報告 ${Date.now()}`, status: "reported" })
      .select()
      .single();
    expect(error).toBeNull();
    if (data) billIds.push(data.id);

    expect(data?.bill_kind).toBe("report");
    expect(data?.stage).toBeNull();
    expect(data?.status).toBe("reported");
  });

  it("stage で作ると status が導出される（status は省略できる）", async () => {
    const { data, error } = await adminClient
      .from("bills")
      .insert({
        name: `条例 ${Date.now()}`,
        bill_kind: "ordinance",
        stage: "in_committee",
      })
      .select()
      .single();
    expect(error).toBeNull();
    if (data) billIds.push(data.id);

    expect(data?.status).toBe("in_originating_house");
    expect(data?.originating_house).toBe("HR");
  });

  it("stage を decided・result を rejected にすると status は rejected", async () => {
    const bill = await createTestBill({
      bill_kind: "ordinance",
      stage: "submitted",
    });
    billIds.push(bill.id);
    expect(bill.status).toBe("introduced");

    const { data, error } = await adminClient
      .from("bills")
      .update({ stage: "decided", result: "rejected" })
      .eq("id", bill.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("rejected");
  });

  it("継続審査は審議中として扱う", async () => {
    const bill = await createTestBill({
      bill_kind: "ordinance",
      stage: "decided",
      result: "continued",
    });
    billIds.push(bill.id);

    expect(bill.status).toBe("in_originating_house");
  });

  it("議決前に result が入っていても消える", async () => {
    const bill = await createTestBill({
      bill_kind: "budget",
      stage: "in_committee",
      result: "passed",
    });
    billIds.push(bill.id);

    expect(bill.result).toBeNull();
    expect(bill.status).toBe("in_originating_house");
  });

  it("status だけを更新する旧来の経路でも stage が追従する", async () => {
    const bill = await createTestBill({
      bill_kind: "ordinance",
      stage: "submitted",
    });
    billIds.push(bill.id);

    const { data, error } = await adminClient
      .from("bills")
      .update({ status: "in_receiving_house" })
      .eq("id", bill.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.stage).toBe("plenary");
  });
});
