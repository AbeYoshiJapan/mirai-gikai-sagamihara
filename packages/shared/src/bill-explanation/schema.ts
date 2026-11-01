import { z } from "zod";

/**
 * 解説生成の出力スキーマ。管理画面で確認してから下書き（bill_contents）に反映する。
 * 自動で公開はしない。
 */

export const explanationVersionSchema = z.object({
  /** 一覧カードに出す、わかりやすい見出し（30字以内） */
  title: z.string().min(1).max(60),
  /** 2〜3 文の要約 */
  summary: z.string().min(1).max(400),
  /** Markdown 本文。見出し（##）で構成する */
  content: z.string().min(1),
});

export const reviewPointSchema = z.object({
  /** 本文のどこに関わるか（見出し名や該当箇所の短い引用） */
  location: z.string().max(120),
  /** 何を確認すべきか */
  reason: z.string().max(300),
});

export const billExplanationSchema = z.object({
  normal: explanationVersionSchema,
  hard: explanationVersionSchema,
  /** 既存タグ名に合うもの、または新しいタグの候補（最大 5） */
  tag_suggestions: z.array(z.string().max(40)).max(5),
  /** 用語解説の候補（最大 8） */
  glossary_suggestions: z
    .array(
      z.object({
        term: z.string().max(40),
        definition: z.string().max(300),
      })
    )
    .max(8),
  /**
   * 「要確認」。一次資料から断定できず、人が確かめるべき点。
   * ここが空になるまで記事レビュー完了にできない
   */
  needs_review: z.array(reviewPointSchema).max(20),
});

export type BillExplanation = z.infer<typeof billExplanationSchema>;
export type ExplanationVersion = z.infer<typeof explanationVersionSchema>;
export type ReviewPoint = z.infer<typeof reviewPointSchema>;

/** generation_jobs.output に保存する形。確認済みフラグを持てるようにする */
export type StoredReviewPoint = ReviewPoint & {
  resolved: boolean;
  resolved_note?: string;
};

export type StoredBillExplanation = Omit<BillExplanation, "needs_review"> & {
  needs_review: StoredReviewPoint[];
  /** 本文末尾に付けた出典ブロック（コードで生成） */
  sources_block: string;
};

export function toStoredExplanation(
  explanation: BillExplanation,
  sourcesBlock: string
): StoredBillExplanation {
  return {
    ...explanation,
    needs_review: explanation.needs_review.map((p) => ({
      ...p,
      resolved: false,
    })),
    sources_block: sourcesBlock,
  };
}

/** 保存済み出力を読むときの検証（手で壊れた JSON に備える） */
export const storedBillExplanationSchema = billExplanationSchema
  .omit({ needs_review: true })
  .extend({
    needs_review: z.array(
      reviewPointSchema.extend({
        resolved: z.boolean().default(false),
        resolved_note: z.string().max(300).optional(),
      })
    ),
    sources_block: z.string().default(""),
  });

export function parseStoredExplanation(
  value: unknown
): StoredBillExplanation | null {
  const result = storedBillExplanationSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function countUnresolvedReviewPoints(
  explanation: Pick<StoredBillExplanation, "needs_review"> | null
): number {
  if (!explanation) return 0;
  return explanation.needs_review.filter((p) => !p.resolved).length;
}
