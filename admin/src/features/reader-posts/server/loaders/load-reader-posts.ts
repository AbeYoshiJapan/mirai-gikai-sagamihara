import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type {
  OpinionInboxFilter,
  QuestionInboxFilter,
} from "../../shared/utils/inbox-filter";
import {
  countReaderOpinionsByStatus,
  findReaderOpinions,
} from "../repositories/reader-opinion-repository";
import {
  countReaderQuestionsByStatus,
  findReaderQuestions,
} from "../repositories/reader-question-repository";

const INBOX_LIMIT = 200;

export async function loadReaderOpinionInbox(params: {
  status: OpinionInboxFilter;
  billId: string | null;
}) {
  noStore();
  const [items, counts] = await Promise.all([
    findReaderOpinions({ ...params, limit: INBOX_LIMIT }),
    countReaderOpinionsByStatus(params.billId),
  ]);
  return {
    items,
    counts,
    limit: INBOX_LIMIT,
    reachedLimit: items.length >= INBOX_LIMIT,
  };
}

export async function loadReaderQuestionInbox(params: {
  status: QuestionInboxFilter;
  billId: string | null;
}) {
  noStore();
  const [items, counts] = await Promise.all([
    findReaderQuestions({ ...params, limit: INBOX_LIMIT }),
    countReaderQuestionsByStatus(params.billId),
  ]);
  return {
    items,
    counts,
    limit: INBOX_LIMIT,
    reachedLimit: items.length >= INBOX_LIMIT,
  };
}
