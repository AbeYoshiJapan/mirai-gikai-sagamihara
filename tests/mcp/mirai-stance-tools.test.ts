import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerMiraiStanceTools } from "../../admin/src/features/mcp/server/tools/register-mirai-stance-tools";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
} from "../supabase/utils";
import { createTestRegistry, type TestMcpRegistry } from "./utils";

describe("MCP mirai-stance tools", () => {
  let registry: TestMcpRegistry;
  const billIds: string[] = [];

  beforeEach(() => {
    registry = createTestRegistry();
    registerMiraiStanceTools(registry.asMcpServer());
  });

  afterEach(async () => {
    // mirai_stances は bills への ON DELETE CASCADE なので bill 削除で一緒に消える
    for (const id of billIds.splice(0)) await cleanupTestBill(id);
  });

  describe("upsert_mirai_stance", () => {
    it("スタンスが無い議案には新規作成する（created: true）", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      const result = await registry.callTool<{
        ok: boolean;
        created: boolean;
        type: string;
      }>("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        comment: "賛成コメント",
      });
      expect(result.ok).toBe(true);
      expect(result.created).toBe(true);
      expect(result.type).toBe("for");

      const { data } = await adminClient
        .from("mirai_stances")
        .select("type, comment")
        .eq("bill_id", bill.id)
        .single();
      expect(data?.type).toBe("for");
      expect(data?.comment).toBe("賛成コメント");
    });

    it("既存スタンスがあれば type / comment を更新する（created: false、行IDは同一）", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        comment: "最初のコメント",
      });
      const { data: before } = await adminClient
        .from("mirai_stances")
        .select("id")
        .eq("bill_id", bill.id)
        .single();

      const result = await registry.callTool<{
        created: boolean;
        type: string;
      }>("upsert_mirai_stance", {
        billId: bill.id,
        type: "against",
        comment: "変更後のコメント",
      });
      expect(result.created).toBe(false);
      expect(result.type).toBe("against");

      const { data: after } = await adminClient
        .from("mirai_stances")
        .select("id, type, comment")
        .eq("bill_id", bill.id)
        .single();
      // UNIQUE(bill_id) なので行は増えず、同じ行が更新される
      expect(after?.id).toBe(before?.id);
      expect(after?.type).toBe("against");
      expect(after?.comment).toBe("変更後のコメント");
    });

    it("comment を省略すると null で保存する", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "neutral",
      });

      const { data } = await adminClient
        .from("mirai_stances")
        .select("comment")
        .eq("bill_id", bill.id)
        .single();
      expect(data?.comment).toBeNull();
    });

    it("publishAt を指定すると公開日時を保存し、null で即時公開に戻す", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        publishAt: "2026-10-01T12:00:00+09:00",
      });
      const { data: scheduled } = await adminClient
        .from("mirai_stances")
        .select("publish_at")
        .eq("bill_id", bill.id)
        .single();
      expect(new Date(scheduled?.publish_at ?? "").toISOString()).toBe(
        "2026-10-01T03:00:00.000Z"
      );

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        publishAt: null,
      });
      const { data: immediate } = await adminClient
        .from("mirai_stances")
        .select("publish_at")
        .eq("bill_id", bill.id)
        .single();
      expect(immediate?.publish_at).toBeNull();
    });

    it("新フォーマットの項目を省略した更新では既存の値を保持する", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        reasonSummary: "賛成します。",
        reasonPoints: ["根拠"],
        supplements: [{ title: "見出し", body: "本文" }],
      });
      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "against",
      });

      const { data } = await adminClient
        .from("mirai_stances")
        .select("type, reason_summary, reason_points, supplements")
        .eq("bill_id", bill.id)
        .single();
      expect(data).toEqual({
        type: "against",
        reason_summary: "賛成します。",
        reason_points: ["根拠"],
        supplements: [{ title: "見出し", body: "本文" }],
      });
    });

    it("publishAt を省略した更新では既存の公開日時を保持する", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        publishAt: "2026-10-01T12:00:00+09:00",
      });
      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "against",
        comment: "更新後",
      });

      const { data } = await adminClient
        .from("mirai_stances")
        .select("type, publish_at")
        .eq("bill_id", bill.id)
        .single();
      expect(data?.type).toBe("against");
      expect(new Date(data?.publish_at ?? "").toISOString()).toBe(
        "2026-10-01T03:00:00.000Z"
      );
    });

    it("MCP から書き込んだ賛否は、公開の指定があっても非公開で保存する", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        // inputSchema に無いので捨てられる（公開は管理画面だけ）
        isPublished: true,
      });
      const { data } = await adminClient
        .from("mirai_stances")
        .select("is_published")
        .eq("bill_id", bill.id)
        .single();
      expect(data?.is_published).toBe(false);
    });

    it("公開中の賛否を MCP から書き換えると、非公開に戻る（確認前の内容を出さない）", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);
      // 運営者が管理画面で公開した賛否
      await adminClient
        .from("mirai_stances")
        .insert({ bill_id: bill.id, type: "for", is_published: true });

      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "against",
      });
      const { data } = await adminClient
        .from("mirai_stances")
        .select("type, is_published")
        .eq("bill_id", bill.id)
        .single();
      expect(data).toEqual({ type: "against", is_published: false });
    });
  });

  describe("get_mirai_stance", () => {
    it("スタンス未設定の議案は stance=null を返す", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);

      const result = await registry.callTool<{
        billId: string;
        stance: { type: string; comment: string | null } | null;
      }>("get_mirai_stance", { billId: bill.id });
      expect(result.billId).toBe(bill.id);
      expect(result.stance).toBeNull();
    });

    it("設定済みの議案は type / comment を返す", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);
      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "against",
        comment: "反対の理由",
      });

      const result = await registry.callTool<{
        stance: { type: string; comment: string | null } | null;
      }>("get_mirai_stance", { billId: bill.id });
      expect(result.stance).toEqual({
        type: "against",
        comment: "反対の理由",
        reasonSummary: null,
        reasonPoints: [],
        supplements: [],
        publishAt: null,
        isPublished: false,
        publishReviewDate: null,
        updatedAt: expect.any(String),
      });
    });

    it("新フォーマットの判断の理由・補足情報を返す", async () => {
      const bill = await createTestBill();
      billIds.push(bill.id);
      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        reasonSummary: "賛成します。",
        reasonPoints: ["必要性", "懸念", "結論"],
        supplements: [{ title: "今後の働きかけ", body: "- 報告を求めます" }],
      });

      const result = await registry.callTool<{
        stance: Record<string, unknown> | null;
      }>("get_mirai_stance", { billId: bill.id });
      expect(result.stance).toMatchObject({
        reasonSummary: "賛成します。",
        reasonPoints: ["必要性", "懸念", "結論"],
        supplements: [{ title: "今後の働きかけ", body: "- 報告を求めます" }],
      });
    });
  });

  describe("公開確認フロー", () => {
    // 非公開・公開確認日つきの賛否を登録し、get_mirai_stance の値を返す
    async function createPendingStance(publishReviewDate: string) {
      const bill = await createTestBill();
      billIds.push(bill.id);
      await registry.callTool("upsert_mirai_stance", {
        billId: bill.id,
        type: "for",
        reasonSummary: "賛成します。",
        isPublished: false,
        publishReviewDate,
      });
      const { stance } = await registry.callTool<{
        stance: { updatedAt: string; publishReviewDate: string | null };
      }>("get_mirai_stance", { billId: bill.id });
      return { bill, stance };
    }

    async function fetchRow(billId: string) {
      const { data } = await adminClient
        .from("mirai_stances")
        .select("is_published, publish_at, publish_review_date, updated_at")
        .eq("bill_id", billId)
        .single();
      return data;
    }

    type PendingList = {
      stances: {
        billId: string;
        billName: string;
        publishReviewDate: string;
      }[];
    };

    it("upsert で非公開のまま公開確認日を保存できる", async () => {
      const { stance } = await createPendingStance("2026-10-20");
      expect(stance.publishReviewDate).toBe("2026-10-20");
    });

    it("list_mirai_stances_pending_review は確認日を迎えた非公開の賛否だけを古い順に返す", async () => {
      const later = await createPendingStance("2099-01-02");
      const earlier = await createPendingStance("2099-01-01");
      const future = await createPendingStance("2099-01-03");
      const published = await createTestBill();
      billIds.push(published.id);
      await registry.callTool("upsert_mirai_stance", {
        billId: published.id,
        type: "for",
      });

      const result = await registry.callTool<PendingList>(
        "list_mirai_stances_pending_review",
        { onOrBefore: "2099-01-02" }
      );
      const ids = result.stances.map((s) => s.billId);
      // 他テストのデータが混ざっても、対象の並び順と除外を検証できるよう絞り込む
      const own = ids.filter((id) =>
        [later.bill.id, earlier.bill.id, future.bill.id, published.id].includes(
          id
        )
      );
      expect(own).toEqual([earlier.bill.id, later.bill.id]);
      expect(
        result.stances.find((s) => s.billId === earlier.bill.id)
      ).toMatchObject({
        billName: earlier.bill.name,
        publishReviewDate: "2099-01-01",
        type: "for",
        reasonSummary: "賛成します。",
      });
    });

    it("publish_mirai_stance ツールは無い（公開は運営者が管理画面で行う）", () => {
      expect(registry.hasTool("publish_mirai_stance")).toBe(false);
    });

    it("update_mirai_stance_review_date は公開確認日だけを更新し updatedAt は変えない", async () => {
      const { bill, stance } = await createPendingStance("2026-10-20");

      const result = await registry.callTool(
        "update_mirai_stance_review_date",
        { billId: bill.id, publishReviewDate: "2026-10-27" }
      );
      expect(result).toEqual({
        ok: true,
        billId: bill.id,
        publishReviewDate: "2026-10-27",
      });
      const row = await fetchRow(bill.id);
      expect(row?.publish_review_date).toBe("2026-10-27");
      expect(new Date(row?.updated_at ?? "").getTime()).toBe(
        new Date(stance.updatedAt).getTime()
      );
      expect(row?.is_published).toBe(false);
    });

    it("update_mirai_stance_review_date は公開済みなら already_published、未設定なら not_found", async () => {
      const published = await createTestBill();
      billIds.push(published.id);
      // 運営者が管理画面で公開した賛否（MCP からは公開できない）
      await adminClient
        .from("mirai_stances")
        .insert({ bill_id: published.id, type: "for", is_published: true });
      const missing = await createTestBill();
      billIds.push(missing.id);

      expect(
        await registry.callTool("update_mirai_stance_review_date", {
          billId: published.id,
          publishReviewDate: "2026-10-27",
        })
      ).toEqual({ ok: false, reason: "already_published" });
      expect(
        await registry.callTool("update_mirai_stance_review_date", {
          billId: missing.id,
          publishReviewDate: "2026-10-27",
        })
      ).toEqual({ ok: false, reason: "not_found" });
    });
  });

  it("登録されているツール名が想定通り", () => {
    expect(registry.toolNames().sort()).toEqual([
      "get_mirai_stance",
      "list_mirai_stances_pending_review",
      "update_mirai_stance_review_date",
      "upsert_mirai_stance",
    ]);
  });
});
