"use server";

import { headers } from "next/headers";
import { createSlackWebhookNotifier } from "@/features/article-reports/server/utils/slack-webhook-notifier";
import { getClientIp } from "@/features/open-data/shared/utils/client-ip";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/site-settings/loader";
import type { SubmitReaderPostResult } from "../../shared/types";
import { submitReaderQuestionCore } from "../services/submit-reader-question-core";

const FEATURE_DISABLED_MESSAGE = "質問フォームは現在受け付けていません";

export async function submitReaderQuestion(input: {
  billId?: string;
  body: string;
  contact?: string;
  consentToPublish?: boolean;
}): Promise<SubmitReaderPostResult> {
  if (!(await isFeatureEnabled("question_form"))) {
    return { ok: false, error: FEATURE_DISABLED_MESSAGE };
  }
  const webhookUrl = env.readerPostSlackWebhookUrl;
  return submitReaderQuestionCore(input, {
    clientIp: getClientIp(await headers()) ?? "unknown",
    now: new Date(),
    adminUrl: env.adminUrl,
    ipHashSalt: env.ipHashSalt,
    notify: webhookUrl ? createSlackWebhookNotifier(webhookUrl) : undefined,
  });
}
