"use client";

import {
  formatReaderOpinionAttributes,
  getReaderDisplayName,
  READER_OPINION_STANCE_LABELS,
  READER_OPINION_STATUS_LABELS,
  type ReaderOpinionStatus,
} from "@mirai-gikai/shared/reader-posts/labels";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatJstDateTime } from "@/features/interview-reports/shared/utils/format-jst-date-time";
import { routes } from "@/lib/routes";
import { reviewReaderOpinion } from "../../server/actions/review-reader-opinion";
import { REPLY_MAX_LENGTH, type ReaderOpinionItem } from "../../shared/types";

const STATUS_BADGE_CLASS: Record<ReaderOpinionStatus, string> = {
  received: "bg-amber-100 text-amber-900",
  published: "bg-green-100 text-green-900",
  rejected: "bg-gray-200 text-gray-700",
};

function OpinionCard({
  item,
  municipality,
}: {
  item: ReaderOpinionItem;
  municipality: string;
}) {
  const router = useRouter();
  const [replyMd, setReplyMd] = useState(item.reply_md);
  const [isPending, startTransition] = useTransition();

  const attributes = formatReaderOpinionAttributes(
    item.attributes,
    municipality
  );
  const replyChanged = replyMd.trim() !== item.reply_md.trim();

  const save = (status: ReaderOpinionStatus, successMessage: string) => {
    startTransition(async () => {
      const result = await reviewReaderOpinion({
        id: item.id,
        status,
        replyMd,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  };

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <Badge className={STATUS_BADGE_CLASS[item.status]}>
          {READER_OPINION_STATUS_LABELS[item.status]}
        </Badge>
        <span className="rounded-full border px-2 py-0.5 font-semibold text-gray-800">
          {READER_OPINION_STANCE_LABELS[item.stance]}
        </span>
        <span className="font-medium text-gray-800">
          {getReaderDisplayName(item.display_name)}
        </span>
        {attributes && <span>{attributes}</span>}
        <span
          className={
            item.consent_to_publish
              ? "text-green-700"
              : "font-semibold text-red-700"
          }
        >
          {item.consent_to_publish ? "公開に同意あり" : "公開に同意なし"}
        </span>
        <span>{formatJstDateTime(item.created_at)}</span>
      </div>
      <p className="mb-2 text-xs text-gray-500">
        議案:{" "}
        <Link
          href={routes.billEdit(item.bill_id) as Route}
          className="text-blue-600 underline"
        >
          {item.bill_name}
        </Link>
      </p>
      <p className="whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm text-gray-900">
        {item.body}
      </p>

      <div className="mt-3">
        <label
          htmlFor={`reply-${item.id}`}
          className="mb-1 block text-xs font-semibold text-gray-700"
        >
          運営者からの返信（任意・Markdown。公開時に意見と一緒に表示）
        </label>
        <Textarea
          id={`reply-${item.id}`}
          value={replyMd}
          onChange={(e) => setReplyMd(e.target.value)}
          rows={3}
          maxLength={REPLY_MAX_LENGTH}
          disabled={isPending}
          placeholder="ご意見ありがとうございます。…"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.status !== "published" && (
          <Button
            size="sm"
            disabled={isPending || !item.consent_to_publish}
            title={
              item.consent_to_publish
                ? undefined
                : "投稿者が公開に同意していないため公開できません"
            }
            onClick={() => save("published", "公開しました")}
          >
            公開する
          </Button>
        )}
        {item.status === "published" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || !replyChanged}
            onClick={() => save("published", "返信を保存しました")}
          >
            返信を保存
          </Button>
        )}
        {item.status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              save(
                "rejected",
                item.status === "published"
                  ? "公開を止めました"
                  : "非公開にしました"
              )
            }
          >
            {item.status === "published" ? "公開を止める" : "非公開にする"}
          </Button>
        )}
        {item.status !== "received" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => save("received", "未対応に戻しました")}
          >
            未対応に戻す
          </Button>
        )}
        {item.published_at && (
          <span className="ml-auto text-xs text-gray-500">
            公開日時: {formatJstDateTime(item.published_at)}
          </span>
        )}
      </div>
    </li>
  );
}

export function ReaderOpinionInbox({
  items,
  municipality,
}: {
  items: ReaderOpinionItem[];
  municipality: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded border bg-white p-6 text-sm text-gray-500">
        該当する意見はありません。
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <OpinionCard key={item.id} item={item} municipality={municipality} />
      ))}
    </ul>
  );
}
