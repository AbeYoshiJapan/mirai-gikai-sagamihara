"use client";

import { DownloadCloud } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routes } from "@/lib/routes";
import { importCouncilQuestionsAction } from "../../server/actions/council-question-actions";
import type { QuestionImportResult } from "../../shared/types";

/**
 * 「通告一覧を取り込む（仮登録）」。議会サイトのページから、いちばん新しい定例会議の
 * 代表質問・個人質疑通告一覧、一般質問通告一覧、一般質問順位を読む。公開はしない。
 */
export function ImportQuestionsPanel({
  noticePageUrl,
}: {
  noticePageUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<QuestionImportResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(!noticePageUrl);
  const [meetingKey, setMeetingKey] = useState("");
  const [urls, setUrls] = useState({
    representative: "",
    general: "",
    order: "",
  });

  const handleImport = () => {
    startTransition(async () => {
      const next = await importCouncilQuestionsAction({
        meetingKey: meetingKey.trim() || undefined,
        pdfUrls: showAdvanced ? urls : undefined,
      });
      setResult(next);
      if (next.ok) {
        toast.success(
          `${next.meetingName}：仮登録 ${next.inserted} 件・更新 ${next.updated} 件・公式の変更 ${next.pending} 件`
        );
        router.refresh();
      } else {
        toast.error(next.error);
      }
    });
  };

  return (
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-sm">
          <div>
            読むページ：
            {noticePageUrl ? (
              <a
                href={noticePageUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-blue-700 underline"
              >
                {noticePageUrl}
              </a>
            ) : (
              <span className="text-red-700">
                未設定（「サイト設定」→「リンク」の「議案のページ」）
              </span>
            )}
          </div>
          <p className="text-gray-600">
            議会サイトに通告一覧の PDF
            が載ったら押してください。読み取った質問は「仮登録」で入り、
            公開されません。PDF と見比べて「確認して公開」してください。
          </p>
        </div>
        <Button onClick={handleImport} disabled={isPending}>
          <DownloadCloud className="mr-2 h-4 w-4" />
          {isPending
            ? "読み取り中…（数十秒かかります）"
            : "通告一覧を取り込む（仮登録）"}
        </Button>
      </div>

      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0 text-xs"
        onClick={() => setShowAdvanced((value) => !value)}
      >
        {showAdvanced
          ? "PDF の URL の指定を閉じる"
          : "定例会議や PDF の URL を指定する"}
      </Button>
      {showAdvanced && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="meeting-key">定例会議（例: 2026-12）</Label>
            <Input
              id="meeting-key"
              value={meetingKey}
              onChange={(e) => setMeetingKey(e.target.value)}
              placeholder="空ならページのいちばん新しい定例会議"
            />
          </div>
          {(
            [
              ["representative", "代表質問・個人質疑通告一覧の PDF"],
              ["general", "一般質問通告一覧の PDF"],
              ["order", "一般質問順位の PDF"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`pdf-${key}`}>{label}</Label>
              <Input
                id={`pdf-${key}`}
                value={urls[key]}
                onChange={(e) => setUrls({ ...urls, [key]: e.target.value })}
                placeholder="https://…/file.pdf"
              />
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-1 text-sm">
          {result.ok ? (
            <p>
              <Link
                href={routes.councilQuestionMeeting(result.meetingKey) as Route}
                className="text-blue-700 underline"
              >
                {result.meetingName}
              </Link>
              ：仮登録 {result.inserted} 件・更新 {result.updated} 件・変わらず{" "}
              {result.unchanged} 件・公式の変更 {result.pending} 件・削除{" "}
              {result.removed} 件
            </p>
          ) : (
            <p className="text-red-700">{result.error}</p>
          )}
          {result.warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
