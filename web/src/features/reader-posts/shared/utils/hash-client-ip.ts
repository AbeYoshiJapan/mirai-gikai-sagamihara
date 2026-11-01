import { createHash } from "node:crypto";

/**
 * 連投対策のために IP アドレスをハッシュ化する。生の IP は保存しない。
 * 秘密の salt が無い環境では、ハッシュから IP を総当たりで逆算できてしまうため
 * 何も保存しない（null）。
 */
export function hashClientIp(
  clientIp: string | null,
  salt: string | undefined
): string | null {
  if (!clientIp || !salt) return null;
  return createHash("sha256").update(`${salt}:${clientIp}`).digest("hex");
}
