"use client";

import { DownloadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchSiteCalendarAction } from "../../server/actions/council-meeting-actions";
import type { SiteCalendarImportResult } from "../../shared/types";

/**
 * 「公式サイトから取得（仮登録）」。今月から 3 か月分のカレンダーを読み、
 * 新しい会議を仮登録する。公開はしない（確認して公開するのは運営者）。
 */
export function FetchCalendarButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SiteCalendarImportResult | null>(null);

  const handleFetch = () => {
    startTransition(async () => {
      const next = await fetchSiteCalendarAction();
      setResult(next);
      if (next.ok) {
        toast.success(
          `取得しました（仮登録 ${next.added} 件・更新 ${next.refreshed} 件・変更あり ${next.changed} 件・消えた ${next.removed} 件）`
        );
        router.refresh();
      } else {
        toast.error(next.error ?? "取得に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleFetch} disabled={disabled || isPending}>
        <DownloadCloud className="mr-2 h-4 w-4" />
        {isPending
          ? "取得中…（数十秒かかります）"
          : "公式サイトから取得（仮登録）"}
      </Button>
      {result && (result.warnings.length > 0 || result.error) && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
          {result.error && <li>{result.error}</li>}
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
