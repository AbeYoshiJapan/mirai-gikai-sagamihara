"use client";

import { checkForkCompliance } from "@mirai-gikai/shared/site-settings/compliance";
import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import {
  SITE_SETTINGS_PRESETS,
  type SiteSettingsPresetId,
} from "@mirai-gikai/shared/site-settings/presets";
import type {
  SiteSettings,
  SiteSettingsSection,
} from "@mirai-gikai/shared/site-settings/schema";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { type FieldValues, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { saveSiteSettingsSections } from "../../server/actions/save-site-settings-section";
import { applyPreset } from "../../shared/apply-preset";
import { getSectionDefinition } from "../../shared/field-definitions";
import { createSiteSettingsResolver } from "../../shared/resolver";
import { ComplianceBanner } from "./compliance-banner";
import { FieldRenderer } from "./field-renderer";
import { SectionFields } from "./section-fields";

interface SetupWizardProps {
  current: SiteSettings;
  isSetupCompleted: boolean;
}

type StepPart = { section: SiteSettingsSection; groups?: string[] };

type Step = {
  id: string;
  title: string;
  description: string;
  parts: StepPart[];
};

const STEPS: Step[] = [
  {
    id: "preset",
    title: "はじめに",
    description:
      "ひな形を選びます。あとから「サイト設定」で何度でも変えられます。",
    parts: [],
  },
  {
    id: "site",
    title: "サイトと議会",
    description: "サイト名と、議会の名前や呼び方。",
    parts: [
      { section: "site", groups: ["基本情報"] },
      { section: "council", groups: ["議会", "呼び方", "会期の制度"] },
    ],
  },
  {
    id: "operator",
    title: "運営者",
    description: "トップページとフッターに出る運営者の情報。",
    parts: [{ section: "operator" }],
  },
  {
    id: "brand",
    title: "見た目とリンク",
    description:
      "ブランド案（ロゴ・画像・色のセット）と、議会公式ページ・ソースコードへのリンク。",
    parts: [
      { section: "brand", groups: ["ブランド案", "テーマ色", "ロゴ・画像"] },
      { section: "links" },
    ],
  },
  {
    id: "features",
    title: "機能と公開",
    description: "公開サイトに出す機能を選び、点検して保存します。",
    parts: [{ section: "features" }],
  },
];

type PresetChoice = SiteSettingsPresetId | "current" | "blank";

const PRESET_CHOICES: {
  id: PresetChoice;
  label: string;
  description: string;
}[] = [
  ...Object.entries(SITE_SETTINGS_PRESETS).map(([id, preset]) => ({
    id: id as SiteSettingsPresetId,
    label: `${preset.label}のひな形`,
    description:
      "議会名・公式ページへのリンク・委員会・会期の方式が入ります。運営者の情報は次の画面で入力します。",
  })),
  {
    id: "current",
    label: "いまの設定から続ける",
    description: "保存済みの設定をそのまま使って見直します。",
  },
  {
    id: "blank",
    label: "空から始める",
    description: "すべて既定値から入力します。",
  },
];

function resolveChoice(
  choice: PresetChoice,
  current: SiteSettings
): SiteSettings {
  if (choice === "current") return current;
  if (choice === "blank") return DEFAULT_SITE_SETTINGS;
  return applyPreset(current, SITE_SETTINGS_PRESETS[choice].settings);
}

/**
 * 初期設定ウィザード。全セクションを 1 つのフォームで持ち、最後にまとめて保存する。
 */
export function SetupWizard({ current, isSetupCompleted }: SetupWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [preset, setPreset] = useState<PresetChoice>(() =>
    isSetupCompleted
      ? "current"
      : (Object.keys(SITE_SETTINGS_PRESETS)[0] as PresetChoice)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FieldValues>({
    resolver: createSiteSettingsResolver(),
    // 最初に選ばれているひな形をフォームにも反映しておく（カードを押さずに進んでも同じ結果になる）
    defaultValues: resolveChoice(preset, current),
    mode: "onBlur",
  });

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const applyChoice = (choice: PresetChoice) => {
    setPreset(choice);
    form.reset(resolveChoice(choice, current));
  };

  const goNext = async () => {
    if (step.parts.length > 0) {
      const ok = await form.trigger();
      const errors = form.formState.errors;
      const stepHasError = step.parts.some((part) => part.section in errors);
      if (!ok && stepHasError) {
        toast.error("入力内容を確認してください");
        return;
      }
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0 });
  };

  const onFinish = async (values: FieldValues) => {
    setIsSubmitting(true);
    try {
      const settings = values as SiteSettings;
      const payload: Partial<Record<SiteSettingsSection, unknown>> = {
        ...settings,
        site: { ...settings.site, setup_completed: true },
      };
      const result = await saveSiteSettingsSections(payload, {
        presetId:
          preset in SITE_SETTINGS_PRESETS
            ? (preset as SiteSettingsPresetId)
            : null,
      });
      if (result.error) {
        if (result.fieldErrors) {
          for (const [path, message] of Object.entries(result.fieldErrors)) {
            form.setError(path, { type: "server", message });
          }
        }
        toast.error(result.error);
        return;
      }
      toast.success("初期設定を保存しました");
      router.push(routes.settings());
      router.refresh();
    } catch (error) {
      console.error("Setup wizard error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFinish)} className="space-y-8">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                i === stepIndex
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                  : i < stepIndex
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-gray-200 text-gray-500"
              )}
            >
              {i < stepIndex ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="text-xs">{i + 1}</span>
              )}
              {s.title}
            </li>
          ))}
        </ol>

        <section className="space-y-6 rounded-lg border bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{step.description}</p>
          </div>

          {step.id === "preset" && (
            <div className="grid gap-3 md:grid-cols-3">
              {PRESET_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => applyChoice(choice.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    preset === choice.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className="font-semibold text-gray-900">{choice.label}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {choice.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step.parts.map((part) => (
            <SectionFields
              key={part.section}
              control={form.control}
              definition={getSectionDefinition(part.section)}
              namePrefix={`${part.section}.`}
              groupTitles={part.groups}
            />
          ))}

          {isLast && <FinishPanel control={form.control} />}
        </section>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0 || isSubmitting}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>
            <Button asChild variant="ghost">
              <Link href={routes.settings()}>あとで設定する</Link>
            </Button>
          </div>
          {isLast ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存して完了"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              次へ
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

function FinishPanel({
  control,
}: {
  control: ReturnType<typeof useForm<FieldValues>>["control"];
}) {
  const values = useWatch({ control }) as SiteSettings;
  const issues = useMemo(() => {
    try {
      return checkForkCompliance(values);
    } catch {
      return [];
    }
  }, [values]);

  const publishedField = getSectionDefinition("site")
    .groups.flatMap((g) => g.fields)
    .find((f) => f.name === "published");

  return (
    <div className="space-y-6 border-t pt-6">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">公開前の点検</h3>
        <ComplianceBanner issues={issues} />
      </div>

      {publishedField && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">公開</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRenderer
              control={control}
              field={{
                ...publishedField,
                description:
                  "オンにするとすぐに公開されます。まず会期と議案を登録してから公開することをおすすめします。",
              }}
              name="site.published"
            />
          </div>
        </div>
      )}

      <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium">保存したあとの手順</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>「会期管理」で現在の会期を登録する</li>
          <li>「議案管理」で議案を登録し、解説を確認して公開する</li>
          <li>「サイト設定」→「サイト」で「公開中」をオンにする</li>
        </ol>
      </div>
    </div>
  );
}
