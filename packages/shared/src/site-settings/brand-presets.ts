import type { BrandColors, BrandPresetId, BrandSection } from "./schema";
import { BRAND_PRESET_IDS } from "./schema";

/**
 * 同梱のブランド案。ロゴ・アイコン・OGP 画像・会期ページの帯と、テーマ色のセット。
 * 画像は web/public/brand/<id>/ に置いてあり、管理画面「サイト設定 → ブランド」で
 * 案を選ぶと色が入り、画像の設定が空のあいだはその案の画像が使われる。
 *
 * 案を増やすときは次の 3 か所だけ：
 *   1. schema.ts の BRAND_PRESET_IDS と brandPresetChoiceSchema に id を足す
 *   2. この表に id・名前・説明・色を足す（画像のパスは assetsFor(id) が作る）
 *   3. web/public/brand/<id>/ に logo.svg / icon-192.png / icon-512.png / icon-180.png /
 *      ogp.png（1200×630）/ hero.png（2880×570）を置く（生成は tools/brand/）
 * テストが「本家の色を使っていない」「白文字が読める濃さ」を自動で確かめる。
 *
 * 色は白文字が読める濃さ（コントラスト比 4.5:1 以上）で選んであり、
 * 本家「みらい議会」の色（#2aa693 / #2a5ea8）は使っていない。
 */

export type BrandAssetPaths = Pick<
  BrandSection,
  | "logo_url"
  | "service_logo_url"
  | "ogp_image_url"
  | "archive_hero_url"
  | "icon_192_url"
  | "icon_512_url"
  | "icon_ios_url"
>;

export type BrandAssetKey = keyof BrandAssetPaths;

export const BRAND_ASSET_KEYS: readonly BrandAssetKey[] = [
  "logo_url",
  "service_logo_url",
  "ogp_image_url",
  "archive_hero_url",
  "icon_192_url",
  "icon_512_url",
  "icon_ios_url",
] as const;

export type BrandPreset = {
  id: BrandPresetId;
  label: string;
  /** モチーフの一言 */
  motif: string;
  /** 選ぶときの説明 */
  description: string;
  colors: BrandColors;
  /** web/public 配下のパス。service_logo_url は空（ヘッダーはサイト名の文字） */
  assets: BrandAssetPaths;
};

function assetsFor(id: BrandPresetId): BrandAssetPaths {
  return {
    logo_url: `/brand/${id}/logo.svg`,
    service_logo_url: "",
    ogp_image_url: `/brand/${id}/ogp.png`,
    archive_hero_url: `/brand/${id}/hero.png`,
    icon_192_url: `/brand/${id}/icon-192.png`,
    icon_512_url: `/brand/${id}/icon-512.png`,
    icon_ios_url: `/brand/${id}/icon-180.png`,
  };
}

export const BRAND_PRESETS: Record<BrandPresetId, BrandPreset> = {
  kakehashi: {
    id: "kakehashi",
    label: "かけはし",
    motif: "吹き出しの中の橋（相模川の橋）",
    description:
      "市民と議会のあいだに橋をかける。さわやかで信頼感のある青。一番クセがなく、どの年代にも安心して見せられる。",
    colors: {
      primary: "#1a78a0",
      primary_accent: "#15607f",
      gradient_start: "#b7e3f0",
      gradient_end: "#e8f6fa",
      theme_color: "#1a78a0",
    },
    assets: assetsFor("kakehashi"),
  },
  ajisai: {
    id: "ajisai",
    label: "あじさい",
    motif: "あじさいの小花の集まり（市の花）",
    description:
      "小さな花（ひとりひとりの声）が集まってひとつの花になる。やわらかい青紫で、親しみやすさと相模原らしさを静かに出す。",
    colors: {
      primary: "#5660b5",
      primary_accent: "#434a94",
      gradient_start: "#d3d7f5",
      gradient_end: "#f0f2fc",
      theme_color: "#5660b5",
    },
    assets: assetsFor("ajisai"),
  },
  gakudo: {
    id: "gakudo",
    label: "咢堂さくら",
    motif: "演壇に立つ人の影と桜（尾崎咢堂・ワシントンの桜）",
    description:
      "相模原が生んだ「憲政の神様」尾崎咢堂にちなみ、演壇に立つ人の影と咢堂が贈った桜で「言葉で政治をつくる」を表す。藍鼠の主色で凛とした印象。",
    colors: {
      primary: "#44507a",
      primary_accent: "#2f3a63",
      gradient_start: "#f7d4dc",
      gradient_end: "#fdf3f5",
      theme_color: "#44507a",
    },
    assets: assetsFor("gakudo"),
  },
  ginga: {
    id: "ginga",
    label: "ぎんが",
    motif: "人工衛星・小惑星・ロケット・星々（JAXA 相模原キャンパス）",
    description:
      "宇宙科学のまち相模原。星空に浮かぶ探査機と小惑星、打ち上がるロケットで「遠くを見る・未来を考える」を表す。紺の 1 色で UI は落ち着き、星空は画像の中だけ。",
    colors: {
      primary: "#2b3f9e",
      primary_accent: "#1d2c70",
      gradient_start: "#c9d3f6",
      gradient_end: "#eef1fb",
      theme_color: "#2b3f9e",
    },
    assets: assetsFor("ginga"),
  },
};

export const DEFAULT_BRAND_PRESET_ID: BrandPresetId = "kakehashi";

export function isBrandPresetId(value: unknown): value is BrandPresetId {
  return (
    typeof value === "string" &&
    (BRAND_PRESET_IDS as readonly string[]).includes(value)
  );
}

/** 選ぶ画面に出す順 */
export const BRAND_PRESET_LIST: readonly BrandPreset[] = BRAND_PRESET_IDS.map(
  (id) => BRAND_PRESETS[id]
);

/**
 * ブランド案を選んだときにフォームへ入れる値。
 * 色を案の色にし、画像のアップロードを空に戻す（空のあいだは案の同梱画像が出る）。
 */
export function buildBrandPresetPatch(
  id: BrandPresetId
): Pick<BrandSection, "preset" | "colors"> & BrandAssetPaths {
  const preset = BRAND_PRESETS[id];
  return {
    preset: id,
    colors: { ...preset.colors },
    logo_url: "",
    service_logo_url: "",
    ogp_image_url: "",
    archive_hero_url: "",
    icon_192_url: "",
    icon_512_url: "",
    icon_ios_url: "",
  };
}

/** 色が案の色から変えられているか（変えてあれば「カスタム」扱いで案内する） */
export function brandColorsMatchPreset(
  colors: BrandColors,
  id: BrandPresetId
): boolean {
  const preset = BRAND_PRESETS[id].colors;
  return (Object.keys(preset) as (keyof BrandColors)[]).every(
    (key) => colors[key].toLowerCase() === preset[key].toLowerCase()
  );
}
