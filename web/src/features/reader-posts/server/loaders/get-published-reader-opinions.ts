import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { PublicReaderOpinion } from "../../shared/types";
import { findPublishedOpinionsByBillId } from "../repositories/reader-opinion-repository";

const PUBLISHED_OPINIONS_LIMIT = 50;

/** 公開中の意見。admin の公開操作で READER_POSTS タグが revalidate される */
export const getPublishedReaderOpinions = unstable_cache(
  async (billId: string): Promise<PublicReaderOpinion[]> => {
    try {
      return await findPublishedOpinionsByBillId(
        billId,
        PUBLISHED_OPINIONS_LIMIT
      );
    } catch (error) {
      console.error("Failed to load published reader opinions:", error);
      return [];
    }
  },
  ["published-reader-opinions"],
  { revalidate: 600, tags: [CACHE_TAGS.READER_POSTS, CACHE_TAGS.BILLS] }
);
