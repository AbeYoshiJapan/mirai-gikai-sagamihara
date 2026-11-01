import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { PublicReaderQuestion } from "../../shared/types";
import {
  findAllPublishedQuestions,
  findPublishedQuestionsByBillId,
} from "../repositories/reader-question-repository";

const PUBLISHED_QUESTIONS_PER_BILL_LIMIT = 30;
const PUBLISHED_QUESTIONS_ALL_LIMIT = 200;

/** 議案に紐づく公開中の質問と回答 */
export const getPublishedReaderQuestionsByBillId = unstable_cache(
  async (billId: string): Promise<PublicReaderQuestion[]> => {
    try {
      return await findPublishedQuestionsByBillId(
        billId,
        PUBLISHED_QUESTIONS_PER_BILL_LIMIT
      );
    } catch (error) {
      console.error("Failed to load published reader questions:", error);
      return [];
    }
  },
  ["published-reader-questions-by-bill"],
  { revalidate: 600, tags: [CACHE_TAGS.READER_POSTS, CACHE_TAGS.BILLS] }
);

/** サイト全体の公開中の質問と回答（よくある質問ページ） */
export const getAllPublishedReaderQuestions = unstable_cache(
  async (): Promise<PublicReaderQuestion[]> => {
    try {
      return await findAllPublishedQuestions(PUBLISHED_QUESTIONS_ALL_LIMIT);
    } catch (error) {
      console.error("Failed to load published reader questions:", error);
      return [];
    }
  },
  ["published-reader-questions-all"],
  { revalidate: 600, tags: [CACHE_TAGS.READER_POSTS, CACHE_TAGS.BILLS] }
);
