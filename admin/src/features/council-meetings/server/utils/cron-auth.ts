import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron の呼び出しか確かめる。Vercel は環境変数 CRON_SECRET を
 * `Authorization: Bearer <CRON_SECRET>` で送ってくる。比べるときは時間差の出ない比較を使う。
 */
export function isCronAuthorized(
  header: string | null,
  secret: string
): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const actual = Buffer.from(header ?? "", "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
