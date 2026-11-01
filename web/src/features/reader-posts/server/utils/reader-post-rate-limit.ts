import "server-only";

import { consumeRateLimit } from "@/features/open-data/server/repositories/open-data-repository";
import { getWindowStart } from "@/features/open-data/shared/utils/rate-limit-window";

const RATE_LIMIT_WINDOW_SECONDS = 600;
const RATE_LIMIT_PER_IP = 5;
const RATE_LIMIT_GLOBAL = 100;

/**
 * 意見・質問フォームの連投対策。10 分あたり IP ごとに 5 件、全体で 100 件まで。
 * IP 制限を通過したリクエストだけが全体枠を消費する。
 */
export async function consumeReaderPostRateLimit(
  clientIp: string,
  now: Date,
  keyPrefix: string
): Promise<boolean> {
  const windowStart = getWindowStart(
    now,
    RATE_LIMIT_WINDOW_SECONDS
  ).toISOString();

  const ipAllowed = await consumeRateLimit({
    key: `${keyPrefix}:ip:${clientIp}`,
    windowStart,
    limit: RATE_LIMIT_PER_IP,
  });
  if (!ipAllowed) return false;

  return consumeRateLimit({
    key: `${keyPrefix}:global`,
    windowStart,
    limit: RATE_LIMIT_GLOBAL,
  });
}
