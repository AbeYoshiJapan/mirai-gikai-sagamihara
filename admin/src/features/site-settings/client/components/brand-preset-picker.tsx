"use client";

import {
  BRAND_PRESET_LIST,
  type BrandPreset,
  brandColorsMatchPreset,
  buildBrandPresetPatch,
} from "@mirai-gikai/shared/site-settings/brand-presets";
import type { BrandColors } from "@mirai-gikai/shared/site-settings/schema";
import { Check } from "lucide-react";
import {
  type Control,
  type FieldValues,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { brandPresetFieldPaths } from "../../shared/brand-preset-form";

interface BrandPresetPickerProps {
  control: Control<FieldValues>;
  /** preset 項目のパス（"preset" または "brand.preset"） */
  name: string;
  disabled?: boolean;
}

/** 公開サイトのオリジン。同梱画像のプレビューはそこから読む */
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

/**
 * 同梱のブランド案を選ぶ。選ぶとテーマ色が入り、画像のアップロードは空に戻る
 * （空のあいだは案の同梱画像が使われる）。保存は親フォームの「保存」で行う。
 */
export function BrandPresetPicker({
  control,
  name,
  disabled,
}: BrandPresetPickerProps) {
  const { setValue } = useFormContext();
  const paths = brandPresetFieldPaths(name);
  const colors = useWatch({ control, name: paths.colors }) as
    | BrandColors
    | undefined;

  const apply = (preset: BrandPreset) => {
    const patch = buildBrandPresetPatch(preset.id);
    setValue(paths.preset, patch.preset, {
      shouldDirty: true,
      shouldValidate: true,
    });
    for (const [key, value] of Object.entries(patch.colors)) {
      setValue(`${paths.colors}.${key}`, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    for (const key of paths.assetKeys) {
      setValue(`${paths.prefix}${key}`, "", { shouldDirty: true });
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            {BRAND_PRESET_LIST.map((preset) => {
              const selected = field.value === preset.id;
              const edited =
                selected &&
                colors !== undefined &&
                !brandColorsMatchPreset(colors, preset.id);
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => apply(preset)}
                  className={`h-auto w-full items-start justify-start gap-4 whitespace-normal p-4 text-left ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : ""
                  }`}
                >
                  {/* 同梱画像は公開サイト側にあるので next/image の最適化対象外 */}
                  {/* biome-ignore lint/performance/noImgElement: 公開サイトの同梱画像のプレビュー */}
                  <img
                    src={`${WEB_URL}${preset.assets.logo_url}`}
                    alt=""
                    width={56}
                    height={50}
                    className="mt-1 h-[50px] w-14 shrink-0 object-contain"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-semibold text-gray-900">
                        {preset.label}
                      </span>
                      {selected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          使用中
                        </span>
                      )}
                      {edited && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          色を変更済み
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {preset.motif}
                    </span>
                    <span className="text-sm font-normal leading-relaxed text-gray-700">
                      {preset.description}
                    </span>
                    <span className="mt-1 flex gap-1" aria-hidden="true">
                      {(
                        [
                          "primary",
                          "primary_accent",
                          "gradient_start",
                          "gradient_end",
                        ] as const
                      ).map((key) => (
                        <span
                          key={key}
                          className="h-5 w-8 rounded border border-black/10"
                          style={{ backgroundColor: preset.colors[key] }}
                        />
                      ))}
                    </span>
                  </span>
                </Button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              aria-pressed={field.value === "custom"}
              disabled={disabled}
              onClick={() =>
                setValue(paths.preset, "custom", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className={`h-auto w-full items-start justify-start gap-4 whitespace-normal p-4 text-left ${
                field.value === "custom"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : ""
              }`}
            >
              <span
                aria-hidden="true"
                className="mt-1 flex h-[50px] w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400"
              >
                自由
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-900">
                    カスタム
                  </span>
                  {field.value === "custom" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      使用中
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  自分で用意した画像と色
                </span>
                <span className="text-sm font-normal leading-relaxed text-gray-700">
                  下のテーマ色とロゴ・画像をそのまま使います。画像が空の欄は「かけはし」の同梱画像になります。
                </span>
              </span>
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            案を選ぶとテーマ色が入り、アップロード済みのロゴ・画像は空に戻ります（空のあいだは案の同梱画像を使います）。選んだあとで色や画像を変えることもできます。「保存」を押すまで公開サイトには反映されません。
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
