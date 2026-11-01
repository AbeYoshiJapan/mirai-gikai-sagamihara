"use client";

import {
  type ComplianceIssue,
  checkForkCompliance,
} from "@mirai-gikai/shared/site-settings/compliance";
import type {
  SiteSettings,
  SiteSettingsSection,
} from "@mirai-gikai/shared/site-settings/schema";
import { ExternalLink, Wand2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/lib/routes";
import { SECTION_DEFINITIONS } from "../../shared/field-definitions";
import { ComplianceBanner } from "./compliance-banner";
import { type HistoryEntry, HistoryList } from "./history-list";
import { SectionForm } from "./section-form";

interface SiteSettingsTabsProps {
  settings: SiteSettings;
  storedSections: SiteSettingsSection[];
  invalidSections: SiteSettingsSection[];
  updatedAt: Partial<Record<SiteSettingsSection, string>>;
  history: Partial<Record<SiteSettingsSection, HistoryEntry[]>>;
  /** 公開前サイトの確認リンク（合言葉付き）。未設定なら出さない */
  previewUrl: string | null;
  webUrl: string;
}

const DEFAULT_TAB: SiteSettingsSection = "site";

function isSection(value: string | null): value is SiteSettingsSection {
  return SECTION_DEFINITIONS.some((d) => d.section === value);
}

/**
 * サイト設定画面の本体。タブはクエリ ?tab=brand で開ける。
 */
export function SiteSettingsTabs({
  settings,
  storedSections,
  invalidSections,
  updatedAt,
  history,
  previewUrl,
  webUrl,
}: SiteSettingsTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SiteSettingsSection>(
    isSection(tabParam) ? tabParam : DEFAULT_TAB
  );
  const [isDirty, setIsDirty] = useState(false);

  const issues: ComplianceIssue[] = useMemo(
    () => checkForkCompliance(settings),
    [settings]
  );

  // タブ切替はクライアント側で完結させ、URL だけ置き換える（再読み込みやリンク共有で同じタブが開く）
  const selectTab = useCallback(
    (section: string) => {
      if (!isSection(section) || section === activeTab) return;
      if (
        isDirty &&
        !window.confirm(
          "保存していない変更があります。破棄してタブを切り替えますか？"
        )
      ) {
        return;
      }
      setIsDirty(false);
      setActiveTab(section);
      window.history.replaceState(
        null,
        "",
        `${routes.settings()}?tab=${section}`
      );
    },
    [activeTab, isDirty]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">サイト設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            公開サイトの名前・色・リンク・文言・機能をここで管理します。保存するとすぐに公開サイトへ反映されます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={routes.setup()}>
              <Wand2 className="mr-1 h-4 w-4" />
              初期設定ウィザード
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={
                !settings.site.published && previewUrl ? previewUrl : webUrl
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              {settings.site.published
                ? "公開サイトを開く"
                : "公開前のサイトを確認"}
            </a>
          </Button>
        </div>
      </div>

      {!settings.site.published && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          このサイトはまだ公開されていません（「準備中」ページが表示されます）。「サイト」タブの「公開中」をオンにすると公開されます。
          {!previewUrl && (
            <span className="block text-xs text-blue-800">
              公開前のサイトを確認するには、環境変数 SITE_PREVIEW_SECRET（または
              REVALIDATE_SECRET）を web と admin の両方に設定してください。
            </span>
          )}
        </div>
      )}

      {invalidSections.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          保存されている設定のうち{" "}
          {invalidSections
            .map(
              (s) =>
                SECTION_DEFINITIONS.find((d) => d.section === s)?.label ?? s
            )
            .join("・")}{" "}
          が現在のスキーマに合わず、既定値で表示しています。保存し直すと直ります。
        </div>
      )}

      <ComplianceBanner issues={issues} onSelectSection={selectTab} />

      <Tabs value={activeTab} onValueChange={selectTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {SECTION_DEFINITIONS.map((definition) => {
            const hasError = issues.some(
              (i) => i.section === definition.section && i.level === "error"
            );
            return (
              <TabsTrigger key={definition.section} value={definition.section}>
                {definition.label}
                {hasError && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500">
                    <span className="sr-only">（要確認）</span>
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SECTION_DEFINITIONS.map((definition) => (
          <TabsContent
            key={definition.section}
            value={definition.section}
            className="space-y-6 rounded-lg border bg-white p-6"
          >
            {activeTab === definition.section && (
              <SectionForm
                key={`${definition.section}:${updatedAt[definition.section] ?? "default"}`}
                section={definition.section}
                values={settings[definition.section]}
                updatedAt={updatedAt[definition.section]}
                isStored={storedSections.includes(definition.section)}
                onDirtyChange={setIsDirty}
              />
            )}
            <HistoryList entries={history[definition.section] ?? []} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
