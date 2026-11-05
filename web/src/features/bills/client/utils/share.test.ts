import { describe, expect, it, vi } from "vitest";

import type { BillWithContent } from "../../shared/types";

// share.ts はサーバー専用のサイト設定ローダーを import するため、ここでは既定値に固定する
vi.mock("@/lib/site-settings/loader", async () => {
  const { DEFAULT_SITE_SETTINGS } = await import(
    "@mirai-gikai/shared/site-settings/defaults"
  );
  return { getSiteSettings: async () => DEFAULT_SITE_SETTINGS };
});

import {
  createBillShareUrl,
  createShareHashtag,
  createShareMessage,
} from "./share";

describe("createBillShareUrl", () => {
  it("generates URL with origin, billId, and difficulty", () => {
    const url = createBillShareUrl("https://example.com", "bill-123", "normal");
    expect(url).toBe("https://example.com/bills/bill-123?difficulty=normal");
  });

  it("generates URL with hard difficulty", () => {
    const url = createBillShareUrl("https://example.com", "bill-456", "hard");
    expect(url).toBe("https://example.com/bills/bill-456?difficulty=hard");
  });

  it("handles origin without trailing slash", () => {
    const url = createBillShareUrl("http://localhost:3000", "abc", "normal");
    expect(url).toBe("http://localhost:3000/bills/abc?difficulty=normal");
  });
});

describe("createShareMessage", () => {
  const baseBill = {
    id: "bill-1",
    name: "正式法案名称",
    tags: [],
  } as unknown as BillWithContent;

  it("uses bill_content.title when available", () => {
    const bill: BillWithContent = {
      ...baseBill,
      bill_content: {
        title: "わかりやすいタイトル",
      } as BillWithContent["bill_content"],
    };
    expect(createShareMessage(bill)).toBe("わかりやすいタイトル #みらい議会");
  });

  it("falls back to bill.name when bill_content is undefined", () => {
    const bill: BillWithContent = {
      ...baseBill,
      bill_content: undefined,
    };
    expect(createShareMessage(bill)).toBe("正式法案名称 #みらい議会");
  });

  it("falls back to bill.name when bill_content.title is null", () => {
    const bill: BillWithContent = {
      ...baseBill,
      bill_content: {
        title: null,
      } as unknown as BillWithContent["bill_content"],
    };
    expect(createShareMessage(bill)).toBe("正式法案名称 #みらい議会");
  });

  it("includes hashtag #みらい議会", () => {
    const message = createShareMessage(baseBill);
    expect(message).toContain("#みらい議会");
  });
});

describe("createShareHashtag", () => {
  it("サイト名の記号を落としてハッシュタグにする", () => {
    expect(createShareHashtag("みらい議会＠相模原市")).toBe(
      "#みらい議会相模原市"
    );
    expect(createShareHashtag("みらい議会@テスト区")).toBe(
      "#みらい議会テスト区"
    );
    // 感嘆符・句点が残るとタグがそこで切れる
    expect(createShareHashtag("さがみはら市議会ナウ！")).toBe(
      "#さがみはら市議会ナウ"
    );
    expect(createShareHashtag("議案に意見！議会をもっと身近に。")).toBe(
      "#議案に意見議会をもっと身近に"
    );
  });

  it("空なら空文字", () => {
    expect(createShareHashtag("")).toBe("");
  });
});

describe("createShareMessage with site name", () => {
  it("サイト名からハッシュタグを付ける", () => {
    const bill = {
      id: "b",
      name: "議案名",
      tags: [],
    } as unknown as BillWithContent;
    expect(createShareMessage(bill, "みらい議会＠相模原市")).toBe(
      "議案名 #みらい議会相模原市"
    );
  });
});
