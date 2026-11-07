import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  fetchSiteBytes,
  fetchSitePage,
  SITE_FETCH_USER_AGENT,
} from "./fetch-site-text";

// 「本会議」の Shift_JIS
const HONKAIGI_SJIS = Buffer.from([150, 123, 137, 239, 139, 99]);

let server: Server;
let baseUrl: string;
const seenUserAgents: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    seenUserAgents.push(String(req.headers["user-agent"]));
    if (req.url === "/sjis") {
      res.writeHead(200, { "Content-Type": "text/html; charset=Shift_JIS" });
      res.end(
        Buffer.concat([
          Buffer.from("<td>"),
          HONKAIGI_SJIS,
          Buffer.from("</td>"),
        ])
      );
      return;
    }
    if (req.url === "/file.pdf") {
      res.writeHead(200, { "Content-Type": "application/pdf" });
      res.end(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]));
      return;
    }
    if (req.url === "/utf8") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end('<meta charset="utf-8"><td>議運</td>');
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("fetchSitePage", () => {
  it("User-Agent は ASCII だけ（日本語を入れると fetch が失敗する）", () => {
    expect(/^[\x20-\x7e]+$/.test(SITE_FETCH_USER_AGENT)).toBe(true);
    expect(
      () => new Headers({ "User-Agent": SITE_FETCH_USER_AGENT })
    ).not.toThrow();
  });

  it("実際に HTTP で読み、User-Agent を名乗る", async () => {
    const page = await fetchSitePage(`${baseUrl}/utf8`);
    expect(page.text).toContain("議運");
    expect(page.charset).toBe("utf-8");
    expect(seenUserAgents).toContain(SITE_FETCH_USER_AGENT);
  });

  it("Shift_JIS のページを文字化けせずに読む", async () => {
    const page = await fetchSitePage(`${baseUrl}/sjis`);
    expect(page).toEqual({ text: "<td>本会議</td>", charset: "shift_jis" });
  });

  it("404 などはエラーにする", async () => {
    await expect(fetchSitePage(`${baseUrl}/missing`)).rejects.toThrow("404");
  });
});

describe("fetchSiteBytes", () => {
  it("ファイルをそのまま読み、大きすぎるものは断る", async () => {
    const bytes = await fetchSiteBytes(`${baseUrl}/file.pdf`);
    expect(Buffer.from(bytes).toString("latin1")).toBe("%PDF-");
    await expect(
      fetchSiteBytes(`${baseUrl}/file.pdf`, { maxBytes: 3 })
    ).rejects.toThrow("大きすぎます");
    await expect(fetchSiteBytes(`${baseUrl}/missing`)).rejects.toThrow("404");
  });
});
