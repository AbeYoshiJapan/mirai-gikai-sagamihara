"use server";

import { headers } from "next/headers";
import { createSlackWebhookNotifier } from "@/features/article-reports/server/utils/slack-webhook-notifier";
import { getClientIp } from "@/features/open-data/shared/utils/client-ip";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/site-settings/loader";
import type { SubmitReaderPostResult } from "../../shared/types";
import { submitReaderOpinionCore } from "../services/submit-reader-opinion-core";

const FEATURE_DISABLED_MESSAGE = "意見フォームは現在受け付けていません";

export async function submitReaderOpinion(input: {
  billId: string;
  stance: string;
  body: string;
  displayName?: string;
  residence?: string;
  ageGroup?: string;
  consentToPublish?: boolean;
}): Promise<SubmitReaderPostResult> {
  if (!(await isFeatureEnabled("opinion_form"))) {
    return { ok: false, error: FEATURE_DISABLED_MESSAGE };
  }
  const webhookUrl = env.readerPostSlackWebhookUrl;
  return submitReaderOpinionCore(input, {
    clientIp: getClientIp(await headers()) ?? "unknown",
    now: new Date(),
    adminUrl: env.adminUrl,
    ipHashSalt: env.ipHashSalt,
    notify: webhookUrl ? createSlackWebhookNotifier(webhookUrl) : undefined,
  });
}
