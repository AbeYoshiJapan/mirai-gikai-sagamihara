"use client";

import type { StoredBillExplanation } from "@mirai-gikai/shared/bill-explanation/schema";
import { BILL_SOURCE_KIND_LABELS } from "@mirai-gikai/shared/bill-sources/labels";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { BillSource } from "@/features/bill-sources/shared/types";
import { routes } from "@/lib/routes";
import { applyGenerationJobAction } from "../../server/actions/apply-generation-job";
import { generateExplanationAction } from "../../server/actions/generate-explanation";
import { resolveReviewPointAction } from "../../server/actions/resolve-review-point";
import {
  GENERATION_STATUS_LABELS,
  type GenerationJobView,
} from "../../shared/types";

interface GenerationPanelProps {
  bill: {
    id: string;
    name: string;
    knowledge_source: string | null;
    /** 公開中なら、反映すると公開を取り下げることを先に確かめる */
    isPublished: boolean;
  };
  sources: BillSource[];
  jobs: GenerationJobView[];
  model: string;
  monthCostUsd: number;
  monthLimitUsd: number;
  /** 直近の生成ジョブを最初に開く */
  initialJobId: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function formatCost(cost: number | null): string {
  if (cost === null) return "—";
  return `$${cost.toFixed(4)}`;
}

/**
 * 生成の入力（一次資料・補足テキスト）と実行ボタン。
 */
function GenerateForm({
  bill,
  sources,
  model,
  monthCostUsd,
  monthLimitUsd,
  onGenerated,
}: {
  bill: GenerationPanelProps["bill"];
  sources: BillSource[];
  model: string;
  monthCostUsd: number;
  monthLimitUsd: number;
  onGenerated: (jobId: string) => void;
}) {
  const [extraText, setExtraText] = useState("");
  const [isPending, startTransition] = useTransition();
  const sourcesWithText = sources.filter((s) => s.extracted_text?.trim());
  const hasInput =
    sourcesWithText.length > 0 ||
    extraText.trim().length > 0 ||
    Boolean(bill.knowledge_source?.trim());

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateExplanationAction({
        billId: bill.id,
        extraText,
      });
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      toast.success("生成が終わりました。内容を確認してください");
      onGenerated(result.jobId);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          解説を生成する
        </CardTitle>
        <p className="text-sm text-gray-500">
          登録済みの一次資料と、ここに貼り付けた資料だけを根拠に、やさしい版・くわしい版の解説を下書きとして作ります。生成しただけでは公開されません。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-700">
            一次資料（{sources.length} 件）
          </p>
          {sources.length === 0 ? (
            <p className="mt-1 text-gray-500">
              まだありません。
              <Link
                href={routes.billEdit(bill.id) as Route}
                className="text-blue-700 underline"
              >
                基本情報の「一次資料」
              </Link>
              で議案書や会議録のリンクを登録できます。
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-gray-700">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="rounded bg-white px-1.5 py-0.5 text-xs border">
                    {BILL_SOURCE_KIND_LABELS[s.kind]}
                  </span>
                  <span className="truncate">{s.label || s.url}</span>
                  <span className="ml-auto shrink-0 text-xs text-gray-500">
                    {s.extracted_text?.trim() ? "本文あり" : "リンクのみ"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {bill.knowledge_source?.trim() && (
            <p className="mt-2 text-xs text-gray-500">
              基本情報の「ナレッジソース」も資料として渡します。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="extra-text" className="text-sm font-medium">
            資料を貼り付ける（任意）
          </label>
          <Textarea
            id="extra-text"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            rows={10}
            placeholder="議案書 PDF からコピーした本文、提案理由、委員会での質疑の要旨など。ここに貼った文章だけが根拠になります。"
            disabled={isPending}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            {extraText.length.toLocaleString()} 文字
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            モデル: {model || "（未設定）"} ／ 今月の生成コスト: $
            {monthCostUsd.toFixed(2)}
            {monthLimitUsd > 0 ? ` / 上限 $${monthLimitUsd}` : "（上限なし）"}
          </div>
          <Button onClick={handleGenerate} disabled={isPending || !hasInput}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中（1〜2 分かかります）
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                生成する
              </>
            )}
          </Button>
        </div>
        {!hasInput && (
          <p className="text-xs text-amber-700">
            一次資料の本文か貼り付けた資料が無いと生成できません。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewPointList({
  job,
  explanation,
  onChanged,
}: {
  job: GenerationJobView;
  explanation: StoredBillExplanation;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const toggle = async (index: number, resolved: boolean) => {
    setBusyIndex(index);
    try {
      const result = await resolveReviewPointAction({
        jobId: job.id,
        index,
        resolved,
        note: notes[index],
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.unresolved === 0) {
        toast.success("要確認をすべて解消しました");
      }
      onChanged();
    } finally {
      setBusyIndex(null);
    }
  };

  if (explanation.needs_review.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4" />
        要確認の項目はありません
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {explanation.needs_review.map((point, index) => (
        <li
          key={`${index}-${point.location}`}
          className={`rounded-md border p-3 ${point.resolved ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={point.resolved}
              onCheckedChange={(checked) => toggle(index, checked === true)}
              disabled={busyIndex === index}
              aria-label={`要確認 ${index + 1} を確認済みにする`}
              className="mt-1"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {point.location}
              </p>
              <p className="text-sm text-gray-700">{point.reason}</p>
              <Input
                value={notes[index] ?? point.resolved_note ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [index]: e.target.value }))
                }
                placeholder="確認した内容のメモ（任意。例: 議案書 3 ページで確認）"
                className="h-8 text-xs"
                disabled={busyIndex === index}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExplanationView({
  job,
  isBillPublished,
  onChanged,
}: {
  job: GenerationJobView;
  isBillPublished: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const explanation = job.explanation;

  if (job.status === "failed") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        生成に失敗しました：{job.error}
      </div>
    );
  }
  if (!explanation) {
    return (
      <p className="text-sm text-gray-500">
        {GENERATION_STATUS_LABELS[job.status]}
      </p>
    );
  }

  const handleApply = async () => {
    if (
      isBillPublished &&
      !window.confirm(
        "この議案は公開中です。反映すると公開を取り下げて下書きに戻します（確認していない本文を公開しないため）。内容を確かめて「記事を確認しました」を押し、もう一度公開するまで公開サイトには出ません。反映しますか？"
      )
    ) {
      return;
    }
    setIsApplying(true);
    try {
      const result = await applyGenerationJobAction(job.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.unpublished
          ? "下書きに反映し、公開を取り下げました。本文を確かめて「記事を確認しました」を押してから、もう一度公開してください"
          : "下書きに反映しました。コンテンツ編集で整え、要確認を解消してから「記事を確認しました」を押してください"
      );
      router.refresh();
      onChanged();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {formatDateTime(job.created_at)} ・ {job.model} ・ コスト{" "}
          {formatCost(job.cost_usd)}
          {job.applied && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
              下書きに反映済み
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            disabled={isApplying}
            variant={job.applied ? "outline" : "default"}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {isApplying
              ? "反映中..."
              : job.applied
                ? "もう一度下書きに反映"
                : "下書きに反映"}
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.billContentsEdit(job.bill_id) as Route}>
              コンテンツ編集へ
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          要確認（{job.unresolved_count} 件が未確認）
        </h3>
        <p className="text-xs text-gray-500">
          AI
          が資料から断定できなかった点です。一次資料で確かめて本文を直し、確認済みにしてください。未確認が残っている間は記事を確認済みにできません。
        </p>
        <ReviewPointList
          job={job}
          explanation={explanation}
          onChanged={onChanged}
        />
      </section>

      <Tabs defaultValue="normal">
        <TabsList>
          <TabsTrigger value="normal">やさしい版</TabsTrigger>
          <TabsTrigger value="hard">くわしい版</TabsTrigger>
        </TabsList>
        {(["normal", "hard"] as const).map((difficulty) => (
          <TabsContent
            key={difficulty}
            value={difficulty}
            className="space-y-3"
          >
            <div className="rounded-md border p-4">
              <p className="text-xs text-gray-500">タイトル</p>
              <p className="text-lg font-bold">
                {explanation[difficulty].title}
              </p>
              <p className="mt-2 text-xs text-gray-500">要約</p>
              <p className="text-sm">{explanation[difficulty].summary}</p>
            </div>
            <div className="prose prose-sm max-w-none rounded-md border p-4">
              <ReactMarkdown>{explanation[difficulty].content}</ReactMarkdown>
              <ReactMarkdown>{explanation.sources_block}</ReactMarkdown>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {(explanation.tag_suggestions.length > 0 ||
        explanation.glossary_suggestions.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-semibold">タグ候補</h3>
            <p className="mt-1 text-xs text-gray-500">
              基本情報のタグ設定で選んでください（自動では付けません）
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {explanation.tag_suggestions.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border bg-gray-50 px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-semibold">用語の候補</h3>
            <dl className="mt-2 space-y-2 text-sm">
              {explanation.glossary_suggestions.map((g) => (
                <div key={g.term}>
                  <dt className="font-medium">{g.term}</dt>
                  <dd className="text-gray-700">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * 生成画面の本体。左に生成フォームと履歴、右に選んだ生成結果。
 */
export function GenerationPanel({
  bill,
  sources,
  jobs,
  model,
  monthCostUsd,
  monthLimitUsd,
  initialJobId,
}: GenerationPanelProps) {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialJobId
  );
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <GenerateForm
        bill={bill}
        sources={sources}
        model={model}
        monthCostUsd={monthCostUsd}
        monthLimitUsd={monthLimitUsd}
        onGenerated={(jobId) => {
          setSelectedJobId(jobId);
          refresh();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>生成結果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">まだ生成していません。</p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={`rounded-md border px-3 py-1.5 text-left text-xs ${
                        job.id === selectedJobId
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">
                        {formatDateTime(job.created_at)}
                      </span>
                      <span className="ml-2 text-gray-500">
                        {GENERATION_STATUS_LABELS[job.status]}
                        {job.applied ? "・反映済み" : ""}
                        {job.unresolved_count > 0
                          ? `・要確認 ${job.unresolved_count}`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {selectedJob && (
                <ExplanationView
                  job={selectedJob}
                  isBillPublished={bill.isPublished}
                  onChanged={refresh}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
