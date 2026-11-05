import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { getOrigin } from "@/lib/utils/url";
import type { BillWithContent } from "../../shared/types";

/**
 * サイト名からハッシュタグを作る。記号・空白を落とす
 * （例: みらい議会＠相模原市 → #みらい議会相模原市、さがみはら市議会ナウ！ → #さがみはら市議会ナウ）。
 * 「！」「。」などが残ると SNS 側でタグがそこで切れるので、句読点・感嘆符も落とす。
 */
export function createShareHashtag(siteName: string): string {
  const cleaned = siteName.replace(
    /[\s@＠#＃・/／()（）「」『』!！?？.。,、，:：;；~〜～-]/g,
    ""
  );
  return cleaned ? `#${cleaned}` : "";
}

/**
 * シェアURLを生成
 */
export function createBillShareUrl(
  origin: string,
  billId: string,
  difficulty: DifficultyLevelEnum
): string {
  return `${origin}/bills/${billId}?difficulty=${difficulty}`;
}

/**
 * シェアメッセージを生成
 */
export function createShareMessage(
  bill: BillWithContent,
  siteName = "みらい議会"
): string {
  const displayTitle = bill.bill_content?.title ?? bill.name;
  const hashtag = createShareHashtag(siteName);
  return hashtag ? `${displayTitle} ${hashtag}` : displayTitle;
}

/**
 * シェアに必要なコンテキスト情報を取得
 */
export async function getShareContext(): Promise<{
  origin: string;
  difficulty: DifficultyLevelEnum;
}> {
  const [origin, difficulty] = await Promise.all([
    getOrigin(),
    getDifficultyLevel(),
  ]);

  return { origin, difficulty };
}

/**
 * 議案のシェアに必要なすべてのデータを取得
 */
export async function getBillShareData(bill: BillWithContent) {
  const [{ origin, difficulty }, { site }] = await Promise.all([
    getShareContext(),
    getSiteSettings(),
  ]);

  return {
    shareUrl: createBillShareUrl(origin, bill.id, difficulty),
    shareMessage: createShareMessage(bill, site.name),
    // シェア用OGP画像を優先的に使用、なければ通常のサムネイル
    thumbnailUrl: bill.share_thumbnail_url || bill.thumbnail_url,
  };
}
