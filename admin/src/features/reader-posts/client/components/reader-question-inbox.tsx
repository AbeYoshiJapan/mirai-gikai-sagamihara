"use client";

import {
  READER_QUESTION_STATUS_LABELS,
  READER_QUESTION_SUMMARY_MAX_LENGTH,
  type ReaderQuestionStatus,
} from "@mirai-gikai/shared/reader-posts/labels";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatJstDateTime } from "@/features/interview-reports/shared/utils/format-jst-date-time";
import { routes } from "@/lib/routes";
import { answerReaderQuestion } from "../../server/actions/answer-reader-question";
import { ANSWER_MAX_LENGTH, type ReaderQuestionItem } from "../../shared/types";

const STATUS_BADGE_CLASS: Record<ReaderQuestionStatus, string> = {
  received: "bg-amber-100 text-amber-900",
  answered: "bg-blue-100 text-blue-900",
  published: "bg-green-100 text-green-900",
  closed: "bg-gray-200 text-gray-700",
};

function QuestionCard({ item }: { item: ReaderQuestionItem }) {
  const router = useRouter();
  const [answerMd, setAnswerMd] = useState(item.answer_md);
  const [questionSummary, setQuestionSummary] = useState(item.question_summary);
  const [isPending, startTransition] = useTransition();

  const hasAnswer = answerMd.trim().length > 0;
  const changed =
    answerMd.trim() !== item.answer_md.trim() ||
    questionSummary.trim() !== item.question_summary.trim();

  const save = (status: ReaderQuestionStatus, successMessage: string) => {
    startTransition(async () => {
      const result = await answerReaderQuestion({
        id: item.id,
        status,
        answerMd,
        questionSummary,
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
          {READER_QUESTION_STATUS_LABELS[item.status]}
        </Badge>
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
      <p className="mb-1 text-xs text-gray-500">
        議案:{" "}
        {item.bill_id && item.bill_name ? (
          <Link
            href={routes.billEdit(item.bill_id) as Route}
            className="text-blue-600 underline"
          >
            {item.bill_name}
          </Link>
        ) : (
          "（議案に紐づかない質問）"
        )}
      </p>
      <p className="mb-2 text-xs text-gray-500">
        返信先:{" "}
        {item.contact ? (
          <a
            href={`mailto:${item.contact}`}
            className="text-blue-600 underline"
          >
            {item.contact}
          </a>
        ) : (
          "なし"
        )}
        <span className="ml-1 text-gray-400">（公開されません）</span>
      </p>
      <p className="whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm text-gray-900">
        {item.body}
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor={`summary-${item.id}`}
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            公開用の質問文（任意。空なら原文をそのまま公開）
          </label>
          <Input
            id={`summary-${item.id}`}
            value={questionSummary}
            onChange={(e) => setQuestionSummary(e.target.value)}
            maxLength={READER_QUESTION_SUMMARY_MAX_LENGTH}
            disabled={isPending}
            placeholder="個人が特定される部分を省くなど、公開向けに言い換えた質問文"
          />
        </div>
        <div>
          <label
            htmlFor={`answer-${item.id}`}
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            回答（Markdown）
          </label>
          <Textarea
            id={`answer-${item.id}`}
            value={answerMd}
            onChange={(e) => setAnswerMd(e.target.value)}
            rows={5}
            maxLength={ANSWER_MAX_LENGTH}
            disabled={isPending}
            placeholder="ご質問ありがとうございます。…"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.status !== "published" && (
          <Button
            size="sm"
            variant={item.status === "answered" ? "outline" : "default"}
            disabled={
              isPending ||
              !hasAnswer ||
              (item.status === "answered" && !changed)
            }
            onClick={() => save("answered", "回答を保存しました")}
          >
            {item.status === "answered"
              ? "回答を更新"
              : "回答を保存（回答済みにする）"}
          </Button>
        )}
        {item.status !== "published" && (
          <Button
            size="sm"
            disabled={isPending || !hasAnswer || !item.consent_to_publish}
            title={
              !item.consent_to_publish
                ? "投稿者が公開に同意していないため公開できません"
                : !hasAnswer
                  ? "回答を書いてから公開してください"
                  : undefined
            }
            onClick={() => save("published", "よくある質問として公開しました")}
          >
            公開する
          </Button>
        )}
        {item.status === "published" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !changed || !hasAnswer}
              onClick={() => save("published", "公開中の回答を更新しました")}
            >
              公開中の回答を更新
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => save("answered", "公開を止めました")}
            >
              公開を止める
            </Button>
          </>
        )}
        {item.status !== "closed" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => save("closed", "終了にしました")}
          >
            終了（回答しない）
          </Button>
        )}
        {item.status !== "received" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => save("received", "未回答に戻しました")}
          >
            未回答に戻す
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

export function ReaderQuestionInbox({
  items,
}: {
  items: ReaderQuestionItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded border bg-white p-6 text-sm text-gray-500">
        該当する質問はありません。
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <QuestionCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
