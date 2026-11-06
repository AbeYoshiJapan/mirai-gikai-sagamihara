"use client";

import {
  BILL_KIND_LABELS,
  BILL_RESULT_LABELS,
  BILL_STAGE_LABELS,
  type BillKind,
  type BillResult,
  type BillStage,
  VOTE_OUTCOME_LABELS,
  type VoteOutcome,
} from "@mirai-gikai/shared/bill-stage/labels";
import type { PlanEntry } from "@mirai-gikai/shared/import/plan";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyImport } from "../../server/actions/apply-import";
import { previewImport } from "../../server/actions/preview-import";
import {
  type ApplyImportSummary,
  IMPORT_JSON_MAX_BYTES,
  type ImportPreview,
} from "../../shared/types";

type SessionOption = { id: string; name: string; is_active: boolean };

const ACTION_LABELS: Record<PlanEntry["action"], string> = {
  create: "追加",
  update: "更新",
  skip: "変更なし",
};

const ACTION_CLASS: Record<PlanEntry["action"], string> = {
  create: "bg-green-100 text-green-900",
  update: "bg-blue-100 text-blue-900",
  skip: "bg-gray-200 text-gray-700",
};

function displayValue(field: string, value: string | null): string {
  if (value === null) return "（空）";
  switch (field) {
    case "stage":
      return BILL_STAGE_LABELS[value as BillStage] ?? value;
    case "result":
      return BILL_RESULT_LABELS[value as BillResult] ?? value;
    case "vote_outcome":
      return VOTE_OUTCOME_LABELS[value as VoteOutcome] ?? value;
    case "bill_kind":
      return BILL_KIND_LABELS[value as BillKind] ?? value;
    default:
      return value;
  }
}

function PlanRow({
  entry,
  checked,
  onToggle,
  disabled,
}: {
  entry: PlanEntry;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled: boolean;
}) {
  const selectable = entry.action !== "skip";
  return (
    <TableRow className={entry.action === "skip" ? "text-gray-500" : undefined}>
      <TableCell className="align-top">
        {selectable && (
          <Checkbox
            checked={checked}
            disabled={disabled}
            onCheckedChange={(value) => onToggle(value === true)}
            aria-label={`${entry.citation} を適用する`}
          />
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-xs">
        {entry.citation}
      </TableCell>
      <TableCell className="align-top text-sm">
        {entry.name}
        {entry.existingPublishStatus === "published" && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
            公開中の議案
          </span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <Badge className={ACTION_CLASS[entry.action]}>
          {ACTION_LABELS[entry.action]}
        </Badge>
      </TableCell>
      <TableCell className="align-top text-xs">
        {entry.action === "create" && entry.draft && (
          <ul className="space-y-0.5">
            <li>種類: {BILL_KIND_LABELS[entry.draft.bill_kind]}</li>
            <li>段階: {BILL_STAGE_LABELS[entry.draft.stage]}</li>
            {entry.draft.submitted_date && (
              <li>提出日: {entry.draft.submitted_date}</li>
            )}
          </ul>
        )}
        {entry.action === "update" && entry.changes.length > 0 && (
          <ul className="space-y-0.5">
            {entry.changes.map((change) => (
              <li key={change.field}>
                {change.label}: {displayValue(change.field, change.from)} →{" "}
                {displayValue(change.field, change.to)}
              </li>
            ))}
          </ul>
        )}
        {entry.sources.some((s) => s.action !== "none") && (
          <ul className="mt-1 space-y-0.5 text-gray-600">
            {entry.sources
              .filter((s) => s.action !== "none")
              .map((s) => (
                <li key={s.url}>
                  一次資料: {s.label}
                  {s.action === "add" ? "を追加" : "の本文を更新"}
                  {s.text
                    ? `（本文 ${s.text.length.toLocaleString()} 文字）`
                    : ""}
                </li>
              ))}
          </ul>
        )}
        {entry.action === "skip" && entry.reason && <span>{entry.reason}</span>}
      </TableCell>
      <TableCell className="align-top text-xs text-amber-800">
        {entry.warnings.length > 0 && (
          <ul className="space-y-0.5">
            {entry.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ImportForm({ sessions }: { sessions: SessionOption[] }) {
  const router = useRouter();
  const fileInputId = useId();
  const [sessionId, setSessionId] = useState<string>(
    sessions.find((s) => s.is_active)?.id ?? sessions[0]?.id ?? ""
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [bundleJson, setBundleJson] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ApplyImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectableCount = useMemo(
    () => preview?.plan.entries.filter((e) => e.action !== "skip").length ?? 0,
    [preview]
  );

  const onFile = (file: File | null) => {
    setPreview(null);
    setSummary(null);
    setBundleJson(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    if (file.size > IMPORT_JSON_MAX_BYTES) {
      toast.error("ファイルが大きすぎます（6MB まで）");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBundleJson(String(reader.result ?? ""));
    reader.onerror = () => toast.error("ファイルを読めませんでした");
    reader.readAsText(file, "utf-8");
  };

  const runPreview = () => {
    if (!bundleJson || !sessionId) return;
    setSummary(null);
    startTransition(async () => {
      const result = await previewImport({ bundleJson, sessionId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreview(result.preview);
      setSelected(
        new Set(
          result.preview.plan.entries
            .filter((e) => e.action !== "skip")
            .map((e) => e.citation)
        )
      );
    });
  };

  const runApply = () => {
    if (!bundleJson || !sessionId || selected.size === 0) return;
    if (
      !window.confirm(
        `${selected.size} 件を適用します。新しく追加される議案は下書きのままで、公開はされません。公開中の議案への更新（議案番号・審議の段階・結果など、一覧で確認した項目）は、適用するとすぐ公開サイトに反映されます。内容を確認しましたか？`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await applyImport({
        bundleJson,
        sessionId,
        citations: Array.from(selected),
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSummary(result.summary);
      setPreview(null);
      toast.success(
        `追加 ${result.summary.created} 件・更新 ${result.summary.updated} 件を適用しました`
      );
      router.refresh();
    });
  };

  const toggle = (citation: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(citation);
      else next.delete(citation);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg border bg-white p-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label
            htmlFor={fileInputId}
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            取込 JSON（tools/import の出力）
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="application/json,.json"
            disabled={isPending}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
          {fileName && <p className="mt-1 text-xs text-gray-500">{fileName}</p>}
        </div>
        <div>
          <span className="mb-1 block text-sm font-semibold text-gray-700">
            新しく作る議案の会期
          </span>
          <Select
            value={sessionId}
            onValueChange={setSessionId}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="会期を選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                  {session.is_active ? "（現在）" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={runPreview}
          disabled={isPending || !bundleJson || !sessionId}
        >
          {isPending && !preview ? "確認中…" : "差分を確認"}
        </Button>
      </div>

      {summary && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-2 text-lg font-bold">適用しました</h2>
          <p className="text-sm text-gray-700">
            追加 {summary.created} 件・更新 {summary.updated}{" "}
            件・変更なし／対象外 {summary.skipped} 件。
            追加した議案は下書きです。解説を生成・確認してから公開してください。
          </p>
          {summary.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red-700">
              {summary.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                <p className="font-semibold">
                  {preview.meeting.session_name ?? ""}{" "}
                  {preview.meeting.label ?? ""}
                  {preview.meeting.as_of
                    ? `（${preview.meeting.as_of} 現在）`
                    : ""}
                  {preview.plan.mode === "results"
                    ? " ・ 審議結果"
                    : " ・ 付議事件一覧"}
                </p>
                <p>
                  追加 {preview.plan.summary.create} 件・更新{" "}
                  {preview.plan.summary.update} 件・ 変更なし{" "}
                  {preview.plan.summary.skip} 件
                  {preview.plan.summary.warnings > 0 &&
                    `・注意 ${preview.plan.summary.warnings} 件`}
                </p>
              </div>
              <Button
                onClick={runApply}
                disabled={isPending || selected.size === 0}
              >
                {isPending
                  ? "適用中…"
                  : `選んだ ${selected.size} / ${selectableCount} 件を適用`}
              </Button>
            </div>
            {preview.bundleWarnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-amber-800">
                {preview.bundleWarnings.map((warning) => (
                  <li key={warning}>注意: {warning}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-40">番号</TableHead>
                  <TableHead>件名</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                  <TableHead className="w-72">内容</TableHead>
                  <TableHead className="w-64">注意</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.plan.entries.map((entry) => (
                  <PlanRow
                    key={entry.citation}
                    entry={entry}
                    checked={selected.has(entry.citation)}
                    onToggle={(checked) => toggle(entry.citation, checked)}
                    disabled={isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
