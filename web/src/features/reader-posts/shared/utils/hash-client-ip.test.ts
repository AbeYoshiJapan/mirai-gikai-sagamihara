import { describe, expect, it } from "vitest";
import { hashClientIp } from "./hash-client-ip";

describe("hashClientIp", () => {
  it("salt が無ければ何も保存しない（null）", () => {
    expect(hashClientIp("203.0.113.1", undefined)).toBeNull();
    expect(hashClientIp("203.0.113.1", "")).toBeNull();
    expect(hashClientIp(null, "salt")).toBeNull();
  });

  it("同じ IP と salt なら同じハッシュ、salt が違えば別のハッシュ", () => {
    const a = hashClientIp("203.0.113.1", "salt-a");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClientIp("203.0.113.1", "salt-a")).toBe(a);
    expect(hashClientIp("203.0.113.1", "salt-b")).not.toBe(a);
    expect(a).not.toContain("203.0.113.1");
  });
});
