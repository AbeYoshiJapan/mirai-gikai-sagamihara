import { describe, expect, it } from "vitest";
import {
  buildShareImageFileName,
  buildShareImageSpec,
  computeShareImageStamp,
  parseGeneratedShareImageUrl,
  parseShareImageSpec,
  selectShareImagesToRefresh,
  shareImageSpecFileName,
} from "./share-image-refresh";

const SUPABASE_URL = "https://example.supabase.co";
const BILL_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_BILL_ID = "99999999-8888-7777-6666-555555555555";
const publicUrl = (fileName: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/bill-thumbnails/${fileName}`;

describe("computeShareImageStamp", () => {
  it("同じサイト名なら同じ印、違えば違う印（16 進 8 桁）", () => {
    const stamp = computeShareImageStamp("さがみはら市議会ナウ！");
    expect(stamp).toMatch(/^[0-9a-f]{8}$/);
    expect(computeShareImageStamp("さがみはら市議会ナウ！")).toBe(stamp);
    expect(computeShareImageStamp("さがみはら議会ナウ！")).not.toBe(stamp);
  });
});

describe("シェア画像のファイル名", () => {
  it("印つきの名前を作り、作り方のファイル名は拡張子だけ変える", () => {
    const name = buildShareImageFileName(BILL_ID, 1730000000000, "0a1b2c3d");
    expect(name).toBe(`share_${BILL_ID}_1730000000000_0a1b2c3d.png`);
    expect(shareImageSpecFileName(name)).toBe(
      `share_${BILL_ID}_1730000000000_0a1b2c3d.json`
    );
  });

  it("テンプレートから作った印つきの画像だけを読み取る", () => {
    const fileName = buildShareImageFileName(
      BILL_ID,
      1730000000000,
      "0a1b2c3d"
    );
    expect(
      parseGeneratedShareImageUrl(publicUrl(fileName), SUPABASE_URL)
    ).toEqual({ billId: BILL_ID, stamp: "0a1b2c3d", fileName });
  });

  it("手でアップロードした画像・印のない古い画像・よそのサイトの画像は対象にしない", () => {
    // 手でアップロードした画像（share_<ID>_<時刻>.<拡張子>）と、印を付ける前の生成画像は同じ形
    expect(
      parseGeneratedShareImageUrl(
        publicUrl(`share_${BILL_ID}_1730000000000.png`),
        SUPABASE_URL
      )
    ).toBeNull();
    expect(
      parseGeneratedShareImageUrl(
        `https://other.example.com/storage/v1/object/public/bill-thumbnails/${buildShareImageFileName(BILL_ID, 1, "0a1b2c3d")}`,
        SUPABASE_URL
      )
    ).toBeNull();
    expect(parseGeneratedShareImageUrl(null, SUPABASE_URL)).toBeNull();
    expect(parseGeneratedShareImageUrl("not a url", SUPABASE_URL)).toBeNull();
  });
});

describe("selectShareImagesToRefresh", () => {
  it("いまのサイト名と違う印の画像だけを選ぶ", () => {
    const current = computeShareImageStamp("新しい名前");
    const old = computeShareImageStamp("古い名前");
    const targets = selectShareImagesToRefresh(
      [
        {
          id: BILL_ID,
          share_thumbnail_url: publicUrl(
            buildShareImageFileName(BILL_ID, 1, old)
          ),
        },
        {
          id: OTHER_BILL_ID,
          share_thumbnail_url: publicUrl(
            buildShareImageFileName(OTHER_BILL_ID, 2, current)
          ),
        },
        { id: "no-image", share_thumbnail_url: null },
      ],
      SUPABASE_URL,
      current
    );
    expect(targets).toEqual([
      { billId: BILL_ID, fileName: buildShareImageFileName(BILL_ID, 1, old) },
    ]);
  });

  it("よその議案の画像を流用している議案は触らない", () => {
    const targets = selectShareImagesToRefresh(
      [
        {
          id: OTHER_BILL_ID,
          share_thumbnail_url: publicUrl(
            buildShareImageFileName(BILL_ID, 1, "00000000")
          ),
        },
      ],
      SUPABASE_URL,
      computeShareImageStamp("新しい名前")
    );
    expect(targets).toEqual([]);
  });
});

describe("シェア画像の作り方（.json）", () => {
  it("書いたものを読み戻せる。壊れた中身は null", () => {
    const spec = buildShareImageSpec({
      title: "道路の\n使用料を上げる？",
      photoUrl: publicUrl(`share-src_${BILL_ID}_1.jpg`),
      siteName: "さがみはら市議会ナウ！",
      now: new Date("2026-11-07T01:00:00Z"),
    });
    expect(parseShareImageSpec(JSON.stringify(spec))).toEqual(spec);
    expect(parseShareImageSpec("{")).toBeNull();
    expect(parseShareImageSpec(JSON.stringify({ title: "x" }))).toBeNull();
  });
});
