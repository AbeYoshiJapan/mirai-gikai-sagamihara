"use client";

import { Check, Copy, ExternalLink, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePrPostLogAction,
  recordPrPostAction,
} from "../../server/actions/pr-actions";
import type { PrDraft, PrPostLog } from "../../shared/types";
import {
  buildXIntentUrl,
  countXWeight,
  X_MAX_WEIGHT,
} from "../../shared/utils/x-text";

const POSTED_AT_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * 投稿の下書き 1 件。文を直して、コピーするか X の投稿画面を開く。
 * 投稿したら「投稿済みにする」で記録を残す（自動では投稿しない）。
 */
export function PrDraftCard({
  draft,
  logs,
  logsReady,
}: {
  draft: PrDraft;
  logs: PrPostLog[];
  logsReady: boolean;
}) {
  const [text, setText] = useState(draft.text);
  const [isPending, startTransition] = useTransition();
  const weight = countXWeight(text);
  const over = weight > X_MAX_WEIGHT;
  const latest = logs[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("コピーしました");
    } catch {
      toast.error("コピーできませんでした。文を選んでコピーしてください");
    }
  };

  const openX = () => {
    window.open(buildXIntentUrl(text), "_blank", "noopener,noreferrer");
  };

  const record = () => {
    startTransition(async () => {
      const result = await recordPrPostAction({
        sourceType: draft.sourceType,
        sourceId: draft.sourceId,
        body: text,
      });
      if ("error" in result) toast.error(result.error);
      else toast.success("投稿済みとして記録しました");
    });
  };

  const undo = (id: string) => {
    startTransition(async () => {
      const result = await deletePrPostLogAction(id);
      if ("error" in result) toast.error(result.error);
      else toast.success("記録を取り消しました");
    });
  };

  return (
    <article className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{draft.heading}</h3>
          {draft.note && <p className="text-sm text-gray-600">{draft.note}</p>}
          <a
            href={draft.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-700 underline"
          >
            公開ページ
            <ExternalLink className="size-3" />
          </a>
        </div>
        {latest && (
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
              <Check className="size-3" />
              投稿済み（{POSTED_AT_FORMAT.format(new Date(latest.postedAt))}
              {logs.length > 1 ? `ほか${logs.length - 1}回` : ""}）
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={isPending}
              onClick={() => undo(latest.id)}
            >
              記録を取り消す
            </Button>
          </div>
        )}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(Math.max(text.split("\n").length + 1, 4), 10)}
        aria-label={`${draft.heading}の投稿の下書き`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={
            over
              ? "text-sm font-semibold text-red-700"
              : "text-sm text-gray-600"
          }
        >
          X の文字数 {weight} / {X_MAX_WEIGHT}
          {over && "（長すぎます。短くしてください）"}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy className="size-4" />
            コピー
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={openX}
            disabled={over || !text.trim()}
          >
            <Send className="size-4" />X で投稿する
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={record}
            disabled={!logsReady || isPending || !text.trim()}
            title={
              logsReady
                ? "X で投稿したあとに押すと、投稿したことを記録します"
                : "投稿の記録には DB の更新が必要です"
            }
          >
            <Check className="size-4" />
            投稿済みにする
          </Button>
        </div>
      </div>
    </article>
  );
}
