import {
  COUNCIL_QUESTION_KIND_ORDER,
  parseBillNumber,
  toBillNumber,
} from "@mirai-gikai/shared/council-questions/types";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type {
  LinkedBill,
  PublicCouncilQuestion,
  PublicTheme,
} from "../../shared/types";
import {
  findPublicThemeById,
  findPublicThemes,
  findPublishedBillsByNumbers,
  findPublishedQuestionById,
  findPublishedQuestionMeetings,
  findPublishedQuestionsByBillRef,
  findPublishedQuestionsByMeeting,
  findPublishedQuestionsByMember,
  findThemeBills,
  findThemeQuestionItems,
  findThemesForQuestions,
} from "../repositories/council-question-repository";

const OPTIONS = { revalidate: 600, tags: [CACHE_TAGS.COUNCIL_QUESTIONS] };
const WITH_BILLS = {
  revalidate: 600,
  tags: [CACHE_TAGS.COUNCIL_QUESTIONS, CACHE_TAGS.BILLS],
};

export const getQuestionMeetings = unstable_cache(
  findPublishedQuestionMeetings,
  ["council-question-meetings"],
  OPTIONS
);

export const getMeetingQuestions = unstable_cache(
  findPublishedQuestionsByMeeting,
  ["council-questions-by-meeting"],
  OPTIONS
);

export const getMemberQuestions = unstable_cache(
  findPublishedQuestionsByMember,
  ["council-questions-by-member"],
  OPTIONS
);

export const getPublicThemes = unstable_cache(
  findPublicThemes,
  ["public-themes"],
  WITH_BILLS
);

export const getThemePage = unstable_cache(
  async (themeId: string) => {
    const theme = await findPublicThemeById(themeId);
    if (!theme) return null;
    const [bills, items] = await Promise.all([
      findThemeBills(themeId),
      findThemeQuestionItems(themeId),
    ]);
    return { theme, bills, items };
  },
  ["public-theme-page"],
  WITH_BILLS
);

/** 質問の詳細：大きな項目ごとのテーマと、項目に出てくる公開中の議案 */
export const getQuestionDetail = unstable_cache(
  async (
    questionId: string
  ): Promise<{
    question: PublicCouncilQuestion;
    themesByItem: Record<number, PublicTheme[]>;
    linkedBills: LinkedBill[];
  } | null> => {
    const question = await findPublishedQuestionById(questionId);
    if (!question) return null;
    const numbers = question.bill_refs
      .map((ref) => toBillNumber(ref, question.meeting_key))
      .filter((n): n is string => n !== null);
    const [themes, linkedBills] = await Promise.all([
      findThemesForQuestions([question.id]),
      findPublishedBillsByNumbers(numbers),
    ]);
    const themesByItem: Record<number, PublicTheme[]> = {};
    for (const link of themes) {
      themesByItem[link.item_number] = [
        ...(themesByItem[link.item_number] ?? []),
        link.theme,
      ];
    }
    return { question, themesByItem, linkedBills };
  },
  ["council-question-detail"],
  WITH_BILLS
);

/** 議案のページに出す、この議案の番号が通告に出てくる質問（定例会議の新しい順・区分・順位） */
export const getBillQuestions = unstable_cache(
  async (
    billNumber: string
  ): Promise<{ ref: string; questions: PublicCouncilQuestion[] } | null> => {
    const parsed = parseBillNumber(billNumber);
    if (!parsed) return null;
    const questions = await findPublishedQuestionsByBillRef(
      parsed.year,
      parsed.ref
    );
    const kindIndex = (q: PublicCouncilQuestion) =>
      COUNCIL_QUESTION_KIND_ORDER.indexOf(q.kind);
    questions.sort(
      (a, b) =>
        b.meeting_key.localeCompare(a.meeting_key) ||
        kindIndex(a) - kindIndex(b) ||
        a.order_no - b.order_no
    );
    return { ref: parsed.ref, questions };
  },
  ["council-questions-by-bill"],
  OPTIONS
);
