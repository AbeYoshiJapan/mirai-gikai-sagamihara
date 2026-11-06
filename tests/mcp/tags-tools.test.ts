import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerTagsTools } from "../../admin/src/features/mcp/server/tools/register-tags-tools";
import {
  cleanupTestBill,
  cleanupTestTag,
  createTestBill,
  createTestBillTag,
  createTestTag,
} from "../supabase/utils";
import { createTestRegistry, type TestMcpRegistry } from "./utils";

describe("MCP tags tools", () => {
  let registry: TestMcpRegistry;
  const tagIds: string[] = [];
  const billIds: string[] = [];

  beforeEach(() => {
    registry = createTestRegistry();
    registerTagsTools(registry.asMcpServer());
  });

  afterEach(async () => {
    for (const id of billIds.splice(0)) await cleanupTestBill(id);
    for (const id of tagIds.splice(0)) await cleanupTestTag(id);
  });

  describe("list_tags", () => {
    it("タグ一覧と紐づく議案数(bill_count)を返す", async () => {
      const tag = await createTestTag();
      tagIds.push(tag.id);
      const bill = await createTestBill();
      billIds.push(bill.id);
      await createTestBillTag(bill.id, tag.id);

      const result =
        await registry.callTool<
          Array<{
            id: string;
            label: string;
            bills_tags: Array<{ count: number }>;
          }>
        >("list_tags");
      const found = result.find((t) => t.id === tag.id);
      expect(found).toBeTruthy();
      expect(found?.label).toBe(tag.label);
      expect(found?.bills_tags?.[0]?.count).toBe(1);
    });
  });

  describe("タグの作成・変更は MCP からできない（管理画面だけ）", () => {
    it("create_tag / update_tag ツールは無い", () => {
      // タグ名・説明は公開中の議案ページにそのまま出るため、AI エージェントからは変えない
      expect(registry.hasTool("create_tag")).toBe(false);
      expect(registry.hasTool("update_tag")).toBe(false);
    });
  });

  it("登録されているツール名が想定通り", () => {
    expect(registry.toolNames()).toEqual(["list_tags"]);
  });
});
