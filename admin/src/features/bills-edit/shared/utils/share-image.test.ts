import { describe, expect, it } from "vitest";
import {
  autoBreakShareImageTitle,
  buildShareImagePreviewPath,
  estimateLineWidthInEm,
  findTitleBreakOpportunities,
  isAllowedSharePhotoUrl,
  listMissingShareImageAssets,
  parseShareImageInput,
  pickLatestShareSourceName,
  SHARE_IMAGE_TITLE_MAX_WIDTH,
  splitShareImageTitle,
  validateShareImageTitle,
  wrapTitleLine,
} from "./share-image";

const SUPABASE_URL = "https://example.supabase.co";
const PHOTO_URL = `${SUPABASE_URL}/storage/v1/object/public/bill-thumbnails/share-src_abc_123.jpg`;

describe("splitShareImageTitle", () => {
  it("改行で分割し、前後の空白と空行を取り除く", () => {
    expect(splitShareImageTitle(" 一行目 \r\n\n二行目\r三行目\n")).toEqual([
      "一行目",
      "二行目",
      "三行目",
    ]);
  });
});

describe("estimateLineWidthInEm", () => {
  it("全角を1、半角を0.65とし、1文字ごとに字間0.03を足す", () => {
    expect(estimateLineWidthInEm("法案")).toBeCloseTo(2.06);
    expect(estimateLineWidthInEm("AI画像")).toBeCloseTo(3.42);
  });
});

describe("validateShareImageTitle", () => {
  it("3行以内・60文字以内なら行の配列を返す（入れた改行はそのまま、標準の大きさ）", () => {
    expect(
      validateShareImageTitle(
        "通信制・定時制高校で\nきちんとした教育が\n行われるようにする法案"
      )
    ).toEqual({
      ok: true,
      lines: [
        "通信制・定時制高校で",
        "きちんとした教育が",
        "行われるようにする法案",
      ],
      fontSize: 105,
      lineHeight: 150,
    });
  });

  it("空ならエラー", () => {
    expect(validateShareImageTitle(" \n ").ok).toBe(false);
  });

  it("4行以上ならエラー", () => {
    expect(validateShareImageTitle("あ\nい\nう\nえ")).toEqual({
      ok: false,
      error: "タイトルは3行以内にしてください",
    });
  });

  it("改行を除いて60文字を超えるとエラー", () => {
    const line = "a".repeat(20);
    expect(validateShareImageTitle(`${line}\n${line}\n${line}`).ok).toBe(true);
    expect(validateShareImageTitle(`${line}\n${line}\n${line}b`)).toEqual({
      ok: false,
      error: "タイトルは改行を除いて60文字以内にしてください",
    });
  });

  it("全角14文字の行は収まる", () => {
    expect(validateShareImageTitle("あ".repeat(14)).ok).toBe(true);
  });

  it("幅に収まらない行は、文のまとまりの切れ目で自動で折り返す", () => {
    const result = validateShareImageTitle(
      "相模原市国民健康保険診療所条例の一部を改正する条例について"
    );
    expect(result).toEqual({
      ok: true,
      lines: [
        "相模原市国民健康保険診療所",
        "条例の一部を改正する",
        "条例について",
      ],
      fontSize: 105,
      lineHeight: 150,
    });
  });

  it("3行に収まらない長さなら文字を小さくして収める", () => {
    const result = validateShareImageTitle(
      "生活保護利用者及び低所得者に対する物価高騰対策として、直接的な現金給付を求めることについて"
    );
    expect(result).toMatchObject({
      ok: true,
      lines: [
        "生活保護利用者及び低所得者に対する",
        "物価高騰対策として、直接的な",
        "現金給付を求めることについて",
      ],
    });
    if (!result.ok) throw new Error("収まるはず");
    expect(result.fontSize).toBeLessThan(105);
    for (const line of result.lines) {
      expect(estimateLineWidthInEm(line) * result.fontSize).toBeLessThanOrEqual(
        SHARE_IMAGE_TITLE_MAX_WIDTH
      );
    }
  });

  it("いちばん小さい文字でも3行に収まらなければ、直し方を添えたエラー", () => {
    const result = validateShareImageTitle(
      `${"あ".repeat(20)}\n${"い".repeat(20)}\n${"う".repeat(19)}`
    );
    expect(result).toEqual({
      ok: false,
      error:
        "長すぎて3行に収まりません。改行の位置を変えるか、言い換えて短くしてください",
    });
  });
});

describe("isAllowedSharePhotoUrl", () => {
  it("自前 Supabase の bill-thumbnails 公開 URL は許可する", () => {
    expect(isAllowedSharePhotoUrl(PHOTO_URL, SUPABASE_URL)).toBe(true);
  });

  it.each([
    [
      "別オリジン",
      "https://evil.example.com/storage/v1/object/public/bill-thumbnails/a.jpg",
    ],
    ["別バケット", `${SUPABASE_URL}/storage/v1/object/public/other/a.jpg`],
    [
      "サブディレクトリ",
      `${SUPABASE_URL}/storage/v1/object/public/bill-thumbnails/a/b.jpg`,
    ],
    [
      "パストラバーサル",
      `${SUPABASE_URL}/storage/v1/object/public/bill-thumbnails/%2e%2e/x`,
    ],
    [
      "認証情報つき",
      "https://user:pass@example.supabase.co/storage/v1/object/public/bill-thumbnails/a.jpg",
    ],
    ["URL でない文字列", "not a url"],
  ])("%s は拒否する", (_, url) => {
    expect(isAllowedSharePhotoUrl(url, SUPABASE_URL)).toBe(false);
  });

  it("ポートが違えば拒否する", () => {
    expect(
      isAllowedSharePhotoUrl(
        "http://127.0.0.1:9999/storage/v1/object/public/bill-thumbnails/a.jpg",
        "http://127.0.0.1:54421"
      )
    ).toBe(false);
  });
});

describe("parseShareImageInput", () => {
  it("写真なしでも requirePhoto が false なら通す", () => {
    expect(
      parseShareImageInput({
        title: "法案",
        photoUrl: null,
        supabaseUrl: SUPABASE_URL,
        requirePhoto: false,
      })
    ).toEqual({
      ok: true,
      lines: ["法案"],
      fontSize: 105,
      lineHeight: 150,
      photoUrl: null,
    });
  });

  it("requirePhoto が true で写真がなければエラー", () => {
    expect(
      parseShareImageInput({
        title: "法案",
        photoUrl: null,
        supabaseUrl: SUPABASE_URL,
        requirePhoto: true,
      }).ok
    ).toBe(false);
  });

  it("許可されない写真 URL はエラー", () => {
    expect(
      parseShareImageInput({
        title: "法案",
        photoUrl: "http://169.254.169.254/latest/meta-data",
        supabaseUrl: SUPABASE_URL,
        requirePhoto: false,
      })
    ).toEqual({ ok: false, error: "背景写真の URL が不正です" });
  });

  it("title が null ならエラー", () => {
    expect(
      parseShareImageInput({
        title: null,
        photoUrl: PHOTO_URL,
        supabaseUrl: SUPABASE_URL,
        requirePhoto: true,
      }).ok
    ).toBe(false);
  });
});

describe("buildShareImagePreviewPath", () => {
  it("title と photoUrl をクエリに入れる", () => {
    const path = buildShareImagePreviewPath({
      title: "一行目\n二行目",
      photoUrl: PHOTO_URL,
    });
    const url = new URL(path, "http://localhost");
    expect(url.pathname).toBe("/api/bill-share-image");
    expect(url.searchParams.get("title")).toBe("一行目\n二行目");
    expect(url.searchParams.get("photoUrl")).toBe(PHOTO_URL);
  });

  it("photoUrl がなければクエリに含めない", () => {
    const path = buildShareImagePreviewPath({ title: "法案", photoUrl: null });
    expect(new URL(path, "http://localhost").searchParams.has("photoUrl")).toBe(
      false
    );
  });
});

describe("listMissingShareImageAssets", () => {
  it("フォントとロゴが揃っていれば空", () => {
    expect(
      listMissingShareImageAssets({
        font: new ArrayBuffer(1),
        logo: "data:image/png;base64,",
      })
    ).toEqual([]);
  });

  it("取れなかったものを列挙する", () => {
    expect(listMissingShareImageAssets({ font: null, logo: null })).toEqual([
      "font",
      "logo",
    ]);
  });
});

describe("findTitleBreakOpportunities", () => {
  const breaksOf = (text: string) => {
    const chars = [...text];
    return [...findTitleBreakOpportunities(chars)]
      .sort((a, b) => a - b)
      .map((i) => chars.slice(0, i).join(""));
  };

  it("句読点の後、ひらがなの後に漢字が続くところで区切れる", () => {
    expect(breaksOf("国に対し、意見書を出す")).toEqual([
      "国に",
      "国に対し、",
      "国に対し、意見書を",
    ]);
  });

  it("行頭に来てはいけない文字の前と、短いかっこの中では区切らない", () => {
    const breaks = breaksOf("防災無線(ひばり放送)更新");
    expect(breaks).toContain("防災無線");
    expect(breaks.some((b) => b.endsWith("ひばり"))).toBe(false);
  });

  it("議案名によく出る言葉の前でも区切れる", () => {
    expect(breaksOf("区画整理事業特別会計決算")).toEqual([
      "区画整理",
      "区画整理事業",
      "区画整理事業特別会計",
    ]);
  });
});

describe("wrapTitleLine", () => {
  it("収まる行はそのまま", () => {
    expect(wrapTitleLine("生活保護基準の引き上げ", 14.8)).toEqual({
      lines: ["生活保護基準の引き上げ"],
      hardBreaks: 0,
      orphans: 0,
    });
  });

  it("最後の行に数文字だけ残す割り付けは避ける", () => {
    const { lines, orphans } = wrapTitleLine(
      "相模原市国民健康保険診療所条例の一部を改正する条例について",
      14.8
    );
    expect(orphans).toBe(0);
    expect(lines.at(-1)?.length).toBeGreaterThan(4);
  });

  it("切れ目の無い長い漢字の並びは文字の途中で区切り、その数を返す", () => {
    const { lines, hardBreaks } = wrapTitleLine("漢".repeat(20), 14.8);
    expect(lines.map((l) => l.length)).toEqual([14, 6]);
    expect(hardBreaks).toBe(1);
  });
});

describe("autoBreakShareImageTitle", () => {
  it("今の改行をいったん外し、自動の位置で改行した文字にする", () => {
    expect(
      autoBreakShareImageTitle(
        "相模原市国民\n健康保険診療所条例の一部を改正する条例について"
      )
    ).toBe("相模原市国民健康保険診療所\n条例の一部を改正する\n条例について");
  });
});

describe("pickLatestShareSourceName", () => {
  const BILL_ID = "a435c85d-62ee-4fb7-b866-37a23185f0f9";

  it("その議案の背景写真のうち、いちばん新しいものを選ぶ", () => {
    expect(
      pickLatestShareSourceName(
        [
          `share-src_${BILL_ID}_1700000000000.jpg`,
          `share-src_${BILL_ID}_1800000000000.png`,
          `share_${BILL_ID}_1900000000000.png`,
          "share-src_00000000-0000-4000-8000-000000000000_1990000000000.jpg",
        ],
        BILL_ID
      )
    ).toBe(`share-src_${BILL_ID}_1800000000000.png`);
  });

  it("無ければ null", () => {
    expect(pickLatestShareSourceName(["thumb.jpg"], BILL_ID)).toBeNull();
  });
});
