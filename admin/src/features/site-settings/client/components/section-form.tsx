"use client";

import type { SiteSettingsSection } from "@mirai-gikai/shared/site-settings/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { saveSiteSettingsSection } from "../../server/actions/save-site-settings-section";
import { getSectionDefinition } from "../../shared/field-definitions";
import { createSectionResolver } from "../../shared/resolver";
import { SectionFields } from "./section-fields";

interface SectionFormProps {
  section: SiteSettingsSection;
  values: FieldValues;
  updatedAt?: string;
  isStored: boolean;
  /** 未保存の変更があるかを親に知らせる（タブ切替の確認に使う） */
  onDirtyChange?: (isDirty: boolean) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/**
 * 設定画面の 1 タブ分のフォーム。保存はセクション単位。
 */
export function SectionForm({
  section,
  values,
  updatedAt,
  isStored,
  onDirtyChange,
}: SectionFormProps) {
  const router = useRouter();
  const definition = getSectionDefinition(section);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FieldValues>({
    resolver: createSectionResolver(section),
    defaultValues: values,
  });

  const onSubmit = async (data: FieldValues) => {
    setIsSubmitting(true);
    try {
      const result = await saveSiteSettingsSection(section, data);
      if (result.error) {
        if (result.fieldErrors) {
          for (const [path, message] of Object.entries(result.fieldErrors)) {
            form.setError(path, { type: "server", message });
          }
        }
        toast.error(result.error);
        return;
      }
      toast.success(`「${definition.label}」を保存しました`);
      form.reset(result.data as FieldValues);
      router.refresh();
    } catch (error) {
      console.error("Save site settings error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { isDirty } = form.formState;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {definition.label}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {definition.description}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            {isStored && updatedAt
              ? `最終更新 ${formatDateTime(updatedAt)}`
              : "未保存（既定値を表示しています）"}
          </p>
        </div>

        <SectionFields control={form.control} definition={definition} />

        <div className="sticky bottom-0 -mx-6 flex items-center gap-3 border-t bg-white/95 px-6 py-3 backdrop-blur">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(values)}
            disabled={isSubmitting || !isDirty}
          >
            変更を取り消す
          </Button>
          {isDirty && (
            <span className="text-sm text-amber-700">
              未保存の変更があります
            </span>
          )}
        </div>
      </form>
    </Form>
  );
}
