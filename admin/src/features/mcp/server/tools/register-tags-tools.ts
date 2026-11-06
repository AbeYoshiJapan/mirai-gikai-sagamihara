import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findAllTagsWithBillCount } from "@/features/tags/server/repositories/tag-repository";
import { jsonResult } from "../utils/json-result";

/**
 * タグは読み取りだけを MCP に出す。
 *
 * タグ名・説明は、付いている公開中の議案のページにそのまま表示され、確認待ちの
 * 状態を持たない。AI エージェントから書き換えると運営者の確認なしに公開サイトが
 * 変わるため、作成・変更は管理画面だけで行う（掲載方針）。
 */
export function registerTagsTools(server: McpServer): void {
  server.registerTool(
    "list_tags",
    {
      title: "タグ一覧を取得",
      description:
        "adminに登録されているすべてのタグを返す。各タグの紐づき議案数(bill_count)も含む。",
      inputSchema: {},
    },
    async () => {
      const tags = await findAllTagsWithBillCount();
      return jsonResult(tags);
    }
  );
}
