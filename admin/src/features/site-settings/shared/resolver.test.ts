import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { SAGAMIHARA_PRESET } from "@mirai-gikai/shared/site-settings/presets";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createSectionResolver,
  createSiteSettingsResolver,
  zodIssuesToFieldErrors,
} from "./resolver";

describe("zodIssuesToFieldErrors", () => {
  it("パスをたどって入れ子の errors にする", () => {
    const schema = z.object({
      colors: z.object({ primary: z.string().regex(/^#/) }),
      committees: z.array(z.object({ name: z.string().min(1) })),
    });
    const result = schema.safeParse({
      colors: { primary: "red" },
      committees: [{ name: "総務" }, { name: "" }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = zodIssuesToFieldErrors(result.error) as Record<
      string,
      unknown
    >;
    expect(errors).toMatchObject({
      colors: { primary: { message: expect.any(String) } },
      committees: { "1": { name: { message: expect.any(String) } } },
    });
  });
});

describe("createSectionResolver", () => {
  it("有効な値は検証済みの値を返す", async () => {
    const resolver = createSectionResolver("brand");
    const result = await resolver({ ...SAGAMIHARA_PRESET.brand }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({
      colors: SAGAMIHARA_PRESET.brand.colors,
    });
  });

  it("不正な色はその項目のエラーになる", async () => {
    const resolver = createSectionResolver("brand");
    const result = await resolver(
      {
        ...DEFAULT_SITE_SETTINGS.brand,
        colors: { ...DEFAULT_SITE_SETTINGS.brand.colors, primary: "green" },
      },
      undefined,
      { fields: {}, shouldUseNativeValidation: false }
    );
    expect(result.values).toEqual({});
    expect(result.errors).toMatchObject({
      colors: { primary: { message: expect.stringContaining("#RRGGBB") } },
    });
  });

  it("保存されていない項目は既定値で補う", async () => {
    const resolver = createSectionResolver("site");
    const result = await resolver({ name: "みらい議会＠相模原市" }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({
      name: "みらい議会＠相模原市",
      timezone: "Asia/Tokyo",
      published: false,
    });
  });
});

describe("createSiteSettingsResolver", () => {
  it("プリセット全体を検証できる", async () => {
    const resolver = createSiteSettingsResolver();
    const result = await resolver(SAGAMIHARA_PRESET, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(result.errors).toEqual({});
  });

  it("エラーはセクション名から始まるパスになる", async () => {
    const resolver = createSiteSettingsResolver();
    const result = await resolver(
      {
        ...SAGAMIHARA_PRESET,
        links: { ...SAGAMIHARA_PRESET.links, fork_repo: "not a url" },
      },
      undefined,
      { fields: {}, shouldUseNativeValidation: false }
    );
    expect(result.errors).toMatchObject({
      links: { fork_repo: { message: expect.any(String) } },
    });
  });
});
