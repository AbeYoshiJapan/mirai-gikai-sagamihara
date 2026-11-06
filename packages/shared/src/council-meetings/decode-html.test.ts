import { describe, expect, it } from "vitest";
import { decodeHtmlBytes, detectHtmlCharset } from "./decode-html";

// 「本会議」の Shift_JIS と「議運」の EUC-JP
const HONKAIGI_SJIS = [150, 123, 137, 239, 139, 99];
const GIUN_EUCJP = [181, 196, 177, 191];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("detectHtmlCharset", () => {
  it("応答ヘッダーの charset を最優先し、表記ゆれをそろえる", () => {
    const bytes = new Uint8Array(ascii('<meta charset="utf-8">'));
    expect(detectHtmlCharset(bytes, "text/html; charset=Shift_JIS")).toBe(
      "shift_jis"
    );
    expect(detectHtmlCharset(bytes, "text/html; charset=windows-31j")).toBe(
      "shift_jis"
    );
  });

  it("ヘッダーに無ければ meta から読む（http-equiv の書き方も）", () => {
    const meta = new Uint8Array(ascii('<meta charset="EUC-JP">'));
    expect(detectHtmlCharset(meta, "text/html")).toBe("euc-jp");
    const httpEquiv = new Uint8Array(
      ascii(
        '<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">'
      )
    );
    expect(detectHtmlCharset(httpEquiv, null)).toBe("shift_jis");
  });

  it("どこにも無ければ utf-8", () => {
    expect(detectHtmlCharset(new Uint8Array(ascii("<p>x</p>")), null)).toBe(
      "utf-8"
    );
  });
});

describe("decodeHtmlBytes", () => {
  it("Shift_JIS と EUC-JP のページを文字化けせずに読む", () => {
    expect(
      decodeHtmlBytes(new Uint8Array(HONKAIGI_SJIS), "text/html; charset=sjis")
        .text
    ).toBe("本会議");
    expect(
      decodeHtmlBytes(new Uint8Array(GIUN_EUCJP), "text/html; charset=euc-jp")
        .text
    ).toBe("議運");
  });

  it("UTF-8 のページはそのまま読む", () => {
    const bytes = new TextEncoder().encode("<td>本会議</td>");
    expect(decodeHtmlBytes(bytes, "text/html; charset=UTF-8")).toEqual({
      text: "<td>本会議</td>",
      charset: "utf-8",
    });
  });

  it("知らない文字コード名なら UTF-8 で読む", () => {
    const bytes = new TextEncoder().encode("本会議");
    expect(decodeHtmlBytes(bytes, "text/html; charset=unknown-x").text).toBe(
      "本会議"
    );
  });
});
