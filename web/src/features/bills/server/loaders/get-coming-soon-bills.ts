import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getActiveDietSession } from "@/features/diet-sessions/server/loaders/get-active-diet-session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { ComingSoonBill } from "../../shared/types";
import { pickComingSoonTitle } from "../../shared/utils/pick-coming-soon-title";
import { findComingSoonBills } from "../repositories/bill-repository";

/**
 * Coming Soon議案を取得する
 * publish_status = 'coming_soon' でアクティブな国会会期の議案を取得
 * アクティブな国会会期がない場合は全件取得
 */
export async function getComingSoonBills(): Promise<ComingSoonBill[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  const activeSession = await getActiveDietSession();

  return _getCachedComingSoonBills(difficultyLevel, activeSession?.id ?? null);
}

const _getCachedComingSoonBills = unstable_cache(
  async (
    difficultyLevel: DifficultyLevelEnum,
    dietSessionId: string | null
  ): Promise<ComingSoonBill[]> => {
    const data = await findComingSoonBills(dietSessionId);

    if (data.length === 0) {
      return [];
    }

    // 解説の見出しは、運営者が確認を済ませた議案だけに使う（確認前は正式名称のみ）
    return data.map((bill) => {
      return {
        id: bill.id,
        name: bill.name,
        title: pickComingSoonTitle(
          bill.bill_contents,
          difficultyLevel,
          bill.is_review_completed
        ),
        originating_house: bill.originating_house,
        shugiin_url: bill.shugiin_url,
      };
    });
  },
  ["coming-soon-bills-list"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS],
  }
);
