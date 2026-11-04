"use client";

import type { Control, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FieldDefinition } from "../../shared/field-definitions";
import { ImageField } from "./image-field";
import { StringListField } from "./string-list-field";

interface FieldRendererProps {
  control: Control<FieldValues>;
  field: FieldDefinition;
  /** フォーム内でのパス。セクション単体なら field.name、全体なら "section.field.name" */
  name: string;
  disabled?: boolean;
}

/**
 * 項目定義 1 つ分のフォーム部品。
 */
export function FieldRenderer({
  control,
  field: def,
  name,
  disabled,
}: FieldRendererProps) {
  const wrapperClass = cn(def.fullWidth && "md:col-span-2");

  if (def.kind === "boolean") {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem
            className={cn(
              "flex flex-row items-center justify-between gap-4 rounded-md border p-3",
              wrapperClass
            )}
          >
            <div className="space-y-0.5">
              <FormLabel>{def.label}</FormLabel>
              {def.description && (
                <FormDescription>{def.description}</FormDescription>
              )}
            </div>
            <FormControl>
              <Switch
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={wrapperClass}>
          <FormLabel>{def.label}</FormLabel>
          <FormControl>
            {def.kind === "textarea" || def.kind === "markdown" ? (
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={def.rows ?? 4}
                placeholder={def.placeholder}
                disabled={disabled}
                className={cn(def.kind === "markdown" && "font-mono text-sm")}
              />
            ) : def.kind === "select" ? (
              <Select
                value={String(field.value ?? "")}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {def.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : def.kind === "color" ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(String(field.value ?? ""))
                      ? String(field.value)
                      : "#000000"
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={disabled}
                  aria-label={`${def.label}を選ぶ`}
                  className="h-9 w-12 cursor-pointer rounded border bg-white p-0.5"
                />
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder="#RRGGBB"
                  disabled={disabled}
                  className="font-mono"
                />
              </div>
            ) : def.kind === "number" ? (
              <Input
                type="number"
                value={
                  field.value === undefined || field.value === null
                    ? ""
                    : String(field.value)
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                onBlur={field.onBlur}
                step="any"
                placeholder={def.placeholder}
                disabled={disabled}
              />
            ) : def.kind === "image" ? (
              <ImageField
                value={String(field.value ?? "")}
                onChange={field.onChange}
                assetKind={def.assetKind ?? "logo"}
                disabled={disabled}
              />
            ) : def.kind === "string-list" ? (
              <StringListField
                value={Array.isArray(field.value) ? field.value : []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                rows={def.rows}
                placeholder={def.placeholder}
                disabled={disabled}
              />
            ) : (
              <Input
                {...field}
                value={field.value ?? ""}
                type={
                  def.kind === "url"
                    ? "url"
                    : def.kind === "date"
                      ? "date"
                      : "text"
                }
                placeholder={def.placeholder}
                disabled={disabled}
              />
            )}
          </FormControl>
          {def.description && (
            <FormDescription>{def.description}</FormDescription>
          )}
          {def.samples && def.samples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>ひな形を入れる（いまの本文は置き換わります）:</span>
              {def.samples.map((sample) => (
                <Button
                  key={sample.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => field.onChange(sample.value)}
                >
                  {sample.label}
                </Button>
              ))}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
