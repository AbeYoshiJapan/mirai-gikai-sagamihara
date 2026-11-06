import { describe, expect, it } from "vitest";
import { mapBillDbError } from "./map-bill-db-error";

describe("mapBillDbError", () => {
  it("AI自動生成版と確認済みの制約違反は日本語の説明を返す", () => {
    const error = {
      code: "23514",
      message:
        'new row for relation "bills" violates check constraint "chk_ai_generated_not_review_completed"',
    };

    expect(mapBillDbError(error, "update")).toBe(
      "AI自動生成版の記事は確認済みにできません。記事の種別を通常版に変えて保存してから、「記事を確認しました」を押してください"
    );
  });

  it("別の CHECK 制約違反は元のメッセージを返す", () => {
    const error = {
      code: "23514",
      message: 'violates check constraint "other_constraint"',
    };

    expect(mapBillDbError(error, "create")).toBe(
      'Failed to create bill: violates check constraint "other_constraint"'
    );
  });

  it("その他のエラーは操作名つきの元のメッセージを返す", () => {
    const error = { code: "23505", message: "duplicate key value" };

    expect(mapBillDbError(error, "update")).toBe(
      "Failed to update bill: duplicate key value"
    );
  });
});
