import "server-only";

import {
  READER_POST_BILL_NOT_FOUND_MESSAGE,
  READER_POST_FAILED_MESSAGE,
  READER_POST_RATE_LIMITED_MESSAGE,
  type SubmitReaderPostResult,
} from "../../shared/types";
import {
  buildAdminReaderQuestionsUrl,
  buildReaderQuestionSlackMessage,
} from "../../shared/utils/build-reader-post-slack-message";
import { hashClientIp } from "../../shared/utils/hash-client-ip";
import { parseReaderQuestionInput } from "../../shared/utils/reader-question-input";
import { findPublishedBillForReaderPost } from "../repositories/reader-opinion-repository";
import { createReaderQuestion } from "../repositories/reader-question-repository";
import { consumeReaderPostRateLimit } from "../utils/reader-post-rate-limit";
import type { SubmitReaderPostDeps } from "./submit-reader-opinion-core";

const DEFAULT_RATE_LIMIT_KEY_PREFIX = "reader-question";

/**
 * 質問の受付。保存するだけで公開はしない（status は DB 既定の received）。
 * 回答と公開は管理画面で管理者が行う。
 */
export async function submitReaderQuestionCore(
  input: unknown,
  deps: SubmitReaderPostDeps
): Promise<SubmitReaderPostResult> {
  const parsed = parseReaderQuestionInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const data = parsed.data;

  let billName: string | null = null;
  try {
    const allowed = await consumeReaderPostRateLimit(
      deps.clientIp,
      deps.now,
      deps.rateLimitKeyPrefix ?? DEFAULT_RATE_LIMIT_KEY_PREFIX
    );
    if (!allowed) {
      return { ok: false, error: READER_POST_RATE_LIMITED_MESSAGE };
    }

    if (data.billId) {
      const bill = await findPublishedBillForReaderPost(data.billId);
      if (!bill) {
        return { ok: false, error: READER_POST_BILL_NOT_FOUND_MESSAGE };
      }
      billName = bill.name;
    }

    await createReaderQuestion({
      billId: data.billId ?? null,
      body: data.body,
      contact: data.contact,
      consentToPublish: data.consentToPublish,
      ipHash: hashClientIp(deps.clientIp, deps.ipHashSalt),
      kind: data.kind,
    });
  } catch (error) {
    console.error("Failed to submit reader question:", error);
    return { ok: false, error: READER_POST_FAILED_MESSAGE };
  }

  if (deps.notify) {
    try {
      await deps.notify(
        buildReaderQuestionSlackMessage({
          kind: data.kind,
          billName,
          hasContact: data.contact.length > 0,
          body: data.body,
          adminInboxUrl: buildAdminReaderQuestionsUrl(deps.adminUrl),
        })
      );
    } catch (error) {
      console.error("Failed to notify reader question to Slack:", error);
    }
  }

  return { ok: true };
}
