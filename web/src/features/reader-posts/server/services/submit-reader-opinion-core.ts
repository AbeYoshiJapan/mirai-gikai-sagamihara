import "server-only";

import type { ArticleReportNotifier } from "@/features/article-reports/server/utils/slack-webhook-notifier";
import {
  READER_POST_BILL_NOT_FOUND_MESSAGE,
  READER_POST_FAILED_MESSAGE,
  READER_POST_RATE_LIMITED_MESSAGE,
  type SubmitReaderPostResult,
} from "../../shared/types";
import {
  buildAdminReaderOpinionsUrl,
  buildReaderOpinionSlackMessage,
} from "../../shared/utils/build-reader-post-slack-message";
import { hashClientIp } from "../../shared/utils/hash-client-ip";
import { parseReaderOpinionInput } from "../../shared/utils/reader-opinion-input";
import {
  createReaderOpinion,
  findPublishedBillForReaderPost,
} from "../repositories/reader-opinion-repository";
import { consumeReaderPostRateLimit } from "../utils/reader-post-rate-limit";

const DEFAULT_RATE_LIMIT_KEY_PREFIX = "reader-opinion";

export type SubmitReaderPostDeps = {
  clientIp: string;
  now: Date;
  adminUrl: string;
  /** IP ハッシュの salt。未設定なら ip_hash を保存しない */
  ipHashSalt?: string;
  /** 未設定なら通知しない */
  notify?: ArticleReportNotifier;
  rateLimitKeyPrefix?: string;
};

/**
 * 意見の受付。保存するだけで公開はしない（status は DB 既定の received）。
 * 公開は管理画面で管理者が確認してから行う。
 */
export async function submitReaderOpinionCore(
  input: unknown,
  deps: SubmitReaderPostDeps
): Promise<SubmitReaderPostResult> {
  const parsed = parseReaderOpinionInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const data = parsed.data;

  let billName: string;
  try {
    const allowed = await consumeReaderPostRateLimit(
      deps.clientIp,
      deps.now,
      deps.rateLimitKeyPrefix ?? DEFAULT_RATE_LIMIT_KEY_PREFIX
    );
    if (!allowed) {
      return { ok: false, error: READER_POST_RATE_LIMITED_MESSAGE };
    }

    const bill = await findPublishedBillForReaderPost(data.billId);
    if (!bill) {
      return { ok: false, error: READER_POST_BILL_NOT_FOUND_MESSAGE };
    }
    billName = bill.name;

    await createReaderOpinion({
      billId: data.billId,
      stance: data.stance,
      body: data.body,
      displayName: data.displayName,
      attributes: {
        ...(data.residence ? { residence: data.residence } : {}),
        ...(data.ageGroup ? { age_group: data.ageGroup } : {}),
      },
      consentToPublish: data.consentToPublish,
      ipHash: hashClientIp(deps.clientIp, deps.ipHashSalt),
    });
  } catch (error) {
    console.error("Failed to submit reader opinion:", error);
    return { ok: false, error: READER_POST_FAILED_MESSAGE };
  }

  if (deps.notify) {
    try {
      await deps.notify(
        buildReaderOpinionSlackMessage({
          billName,
          stance: data.stance,
          consentToPublish: data.consentToPublish,
          body: data.body,
          adminInboxUrl: buildAdminReaderOpinionsUrl(deps.adminUrl),
        })
      );
    } catch (error) {
      console.error("Failed to notify reader opinion to Slack:", error);
    }
  }

  return { ok: true };
}
