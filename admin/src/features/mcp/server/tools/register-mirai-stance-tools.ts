import "server-only";

import { parseStanceSupplements } from "@mirai-gikai/shared/mirai-stance/reason-format";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  findStanceByBillId,
  findStancesPendingReview,
  updateUnpublishedStanceReviewDate,
  upsertUnpublishedMiraiStance,
} from "@/features/mirai-stance/server/repositories/mirai-stance-repository";
import {
  publishReviewDateSchema,
  stanceInputSchema,
} from "@/features/mirai-stance/shared/types";
import { invalidateBillsCache } from "../utils/invalidate-bills-cache";
import { jsonResult } from "../utils/json-result";

export function registerMiraiStanceTools(server: McpServer): void {
  server.registerTool(
    "get_mirai_stance",
    {
      title: "運営者の賛否を取得",
      description:
        "指定議案に対する運営者の賛否スタンス(mirai_stances)を返す。未設定なら stance=null。publishAt は公開日時（null は即時公開）、isPublished は公開/非公開（false は公開日時に関わらず非公開。公開は管理画面だけで行う）、publishReviewDate は非公開の賛否について公開確認を出す日（JST の YYYY-MM-DD）、updatedAt は最終更新日時。判断の理由は新フォーマット（reasonSummary / reasonPoints / supplements）と旧フォーマット（comment）があり、公開サイトは新フォーマットのデータがあれば優先して表示する。差分反映（既に同じ賛否が設定済みなら再提案・再反映しない）の判定に使う。",
      inputSchema: {
        billId: z.string().uuid(),
      },
    },
    async ({ billId }) => {
      const stance = await findStanceByBillId(billId);
      return jsonResult({
        billId,
        stance: stance
          ? {
              type: stance.type,
              comment: stance.comment,
              reasonSummary: stance.reason_summary,
              reasonPoints: stance.reason_points,
              supplements: parseStanceSupplements(stance.supplements),
              publishAt: stance.publish_at,
              isPublished: stance.is_published,
              publishReviewDate: stance.publish_review_date,
              updatedAt: stance.updated_at,
            }
          : null,
      });
    }
  );

  server.registerTool(
    "upsert_mirai_stance",
    {
      title: "運営者の賛否を設定（非公開で保存）",
      description:
        "指定議案に対する運営者の賛否スタンスをupsertする（1議案につき1件）。MCP から書き込んだ賛否は必ず非公開で保存され、公開中の賛否も非公開に戻る。公開は運営者が管理画面で内容を確かめてから行う。既存スタンスがあれば type / comment を更新し、なければ新規作成する。type は for / against / neutral / conditional_for / conditional_against / considering / continued_deliberation のいずれか。publishAt に ISO 8601 日時（タイムゾーン付き）を指定すると、運営者が公開にしたあとその日時まで公開サイトに表示しない予約公開になり、null で即時、省略時は既存の公開日時を変更しない。publishReviewDate（JST の YYYY-MM-DD）は非公開の賛否について公開確認を出す日で、null で解除、省略時は既存の値を変更しない。判断の理由は新フォーマット（reasonSummary: 一言、reasonPoints: 箇条書き、supplements: 見出しとMarkdown本文の補足情報）または旧フォーマット（comment: 自由記述）で指定する。新フォーマットの各項目は省略時に既存の値を変更しない（comment は従来どおり省略時に null で保存する）。",
      inputSchema: {
        billId: z.string().uuid(),
        // 公開／非公開は MCP からは変えられない（常に非公開で保存する）
        ...stanceInputSchema.omit({ isPublished: true }).shape,
      },
    },
    async ({ billId, ...input }) => {
      // created は「新規か更新か」を呼び出し側（Slack bot）に伝えるための
      // best-effort な情報。実際の書き込みは upsertMiraiStance が
      // onConflict(bill_id) で atomic に行う。事前 read が失敗しても created の
      // 精度が落ちるだけで、書き込み自体はブロックしない。
      let existing: Awaited<ReturnType<typeof findStanceByBillId>> = null;
      try {
        existing = await findStanceByBillId(billId);
      } catch {
        // best-effort: read 失敗時は created を判定できないため未知扱い
      }
      await upsertUnpublishedMiraiStance(billId, input);
      await invalidateBillsCache();
      return jsonResult({
        ok: true,
        created: existing === null,
        type: input.type,
      });
    }
  );

  server.registerTool(
    "list_mirai_stances_pending_review",
    {
      title: "公開確認待ちの運営者の賛否を一覧",
      description:
        "非公開（isPublished=false）かつ公開確認日（publishReviewDate）が onOrBefore（JST の YYYY-MM-DD）以前の賛否を、公開確認日の古い順に返す。運営者へ公開確認を出す対象の取得に使う（公開は運営者が管理画面で行う）。",
      inputSchema: {
        onOrBefore: publishReviewDateSchema,
      },
    },
    async ({ onOrBefore }) => {
      const stances = await findStancesPendingReview(onOrBefore);
      return jsonResult({
        stances: stances.map((stance) => ({
          billId: stance.bill_id,
          billName: stance.bills?.name ?? null,
          type: stance.type,
          reasonSummary: stance.reason_summary,
          reasonPoints: stance.reason_points,
          comment: stance.comment,
          publishReviewDate: stance.publish_review_date,
          updatedAt: stance.updated_at,
        })),
      });
    }
  );

  server.registerTool(
    "update_mirai_stance_review_date",
    {
      title: "運営者の賛否の公開確認日を変更",
      description:
        "非公開の賛否の公開確認日（JST の YYYY-MM-DD）を変更する。内容の変更ではないため updatedAt は更新しない。賛否未設定なら ok=false, reason=not_found、公開済みなら reason=already_published を返す。",
      inputSchema: {
        billId: z.string().uuid(),
        publishReviewDate: publishReviewDateSchema,
      },
    },
    async ({ billId, publishReviewDate }) => {
      const updated = await updateUnpublishedStanceReviewDate(
        billId,
        publishReviewDate
      );
      if (!updated) {
        const stance = await findStanceByBillId(billId);
        return jsonResult({
          ok: false,
          reason: stance ? "already_published" : "not_found",
        });
      }
      return jsonResult({ ok: true, billId, publishReviewDate });
    }
  );
}
