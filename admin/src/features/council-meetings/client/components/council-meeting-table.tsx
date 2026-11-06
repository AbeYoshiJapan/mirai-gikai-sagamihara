"use client";

import { Check, ExternalLink, Pencil, Trash2, Undo2, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  applyPendingUpdateAction,
  confirmCouncilMeetingsAction,
  deleteCouncilMeetingAction,
  dismissPendingUpdateAction,
  unpublishCouncilMeetingAction,
} from "../../server/actions/council-meeting-actions";
import {
  type AdminCouncilMeeting,
  MEETING_CATEGORY_LABELS,
} from "../../shared/types";
import {
  describePendingChanges,
  getMeetingReviewState,
  MEETING_REVIEW_STATE_LABELS,
  type MeetingReviewState,
  readPendingUpdate,
} from "../../shared/utils/meeting-review-state";
import { formatDateWithWeekday } from "../../shared/utils/meeting-views";

const STATE_BADGE_CLASS: Record<MeetingReviewState, string> = {
  provisional: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  changed: "bg-orange-100 text-orange-900 hover:bg-orange-100",
  removed: "bg-red-100 text-red-900 hover:bg-red-100",
  published: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
};

type Result = { error?: string };

function MeetingRow({
  meeting,
  selected,
  onSelect,
  run,
  isPending,
}: {
  meeting: AdminCouncilMeeting;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  run: (action: () => Promise<Result>, success: string) => void;
  isPending: boolean;
}) {
  const state = getMeetingReviewState(meeting);
  const pending = readPendingUpdate(meeting.pending_update);
  const changes = describePendingChanges(pending);
  const dateLabel = meeting.end_date
    ? `${formatDateWithWeekday(meeting.meeting_date)}〜${formatDateWithWeekday(meeting.end_date)}`
    : formatDateWithWeekday(meeting.meeting_date);

  return (
    <TableRow className={cn(state !== "published" && "bg-amber-50/40")}>
      <TableCell className="w-8 align-top">
        {!meeting.is_published && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(checked === true)}
            aria-label={`${meeting.name}を選ぶ`}
          />
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-sm">
        {dateLabel}
        {meeting.start_time && (
          <div className="text-xs text-gray-500">{meeting.start_time}</div>
        )}
      </TableCell>
      <TableCell className="align-top">
        <div className="font-medium">{meeting.name}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
          <span>{MEETING_CATEGORY_LABELS[meeting.category]}</span>
          {meeting.site_label && meeting.site_label !== meeting.name && (
            <span>カレンダーの表記：{meeting.site_label}</span>
          )}
          {meeting.place && <span>場所：{meeting.place}</span>}
          {meeting.session_label && <span>{meeting.session_label}</span>}
        </div>
        {changes.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-xs text-orange-900">
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        )}
        {state === "removed" && (
          <p className="mt-1 text-xs text-red-800">
            最新の公式サイトのカレンダーに見当たりません（中止・延期の可能性）。公式サイトで確かめてください
          </p>
        )}
      </TableCell>
      <TableCell className="align-top">
        <Badge className={STATE_BADGE_CLASS[state]}>
          {MEETING_REVIEW_STATE_LABELS[state]}
        </Badge>
        <div className="mt-1 text-xs text-gray-500">
          {meeting.source === "site" ? "自動取得" : "手入力"}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap gap-1">
          {state === "changed" && (
            <Button
              size="sm"
              onClick={() =>
                run(
                  () => applyPendingUpdateAction(meeting.id),
                  "公式サイトの変更を反映しました"
                )
              }
              disabled={isPending}
            >
              <Check className="mr-1 h-4 w-4" />
              変更を反映
            </Button>
          )}
          {(state === "changed" || state === "removed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => dismissPendingUpdateAction(meeting.id),
                  "今の内容のままにしました"
                )
              }
              disabled={isPending}
            >
              <X className="mr-1 h-4 w-4" />
              無視
            </Button>
          )}
          {!meeting.is_published && (
            <Button
              size="sm"
              onClick={() =>
                run(
                  () => confirmCouncilMeetingsAction([meeting.id]),
                  "確認済みとして公開しました"
                )
              }
              disabled={isPending}
            >
              <Check className="mr-1 h-4 w-4" />
              確認して公開
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href={routes.councilMeetingEdit(meeting.id) as Route}>
              <Pencil className="mr-1 h-4 w-4" />
              編集
            </Link>
          </Button>
          {meeting.is_published && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => unpublishCouncilMeetingAction(meeting.id),
                  "公開を取り下げました"
                )
              }
              disabled={isPending}
            >
              <Undo2 className="mr-1 h-4 w-4" />
              取り下げ
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!window.confirm(`「${meeting.name}」を削除しますか？`))
                return;
              run(() => deleteCouncilMeetingAction(meeting.id), "削除しました");
            }}
            disabled={isPending}
            aria-label="削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {meeting.source === "site" && (
            <Button size="sm" variant="ghost" asChild>
              <a
                href={meeting.source_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="公式サイトの詳細ページ"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** 会議予定の一覧。仮登録は選んでまとめて「確認して公開」できる */
export function CouncilMeetingTable({
  meetings,
}: {
  meetings: AdminCouncilMeeting[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectable = meetings.filter((m) => !m.is_published);

  const run = (action: () => Promise<Result>, success: string) => {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      setSelected(new Set());
      router.refresh();
    });
  };

  if (meetings.length === 0) {
    return (
      <p className="rounded-md border bg-white p-6 text-sm text-gray-500">
        該当する会議予定はありません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {selectable.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              if (
                !window.confirm(
                  `選んだ ${selected.size} 件を、確認済みとして公開します。日付・会議名・時刻・場所を公式サイトで確かめましたか？`
                )
              ) {
                return;
              }
              run(
                () => confirmCouncilMeetingsAction([...selected]),
                `${selected.size} 件を公開しました`
              );
            }}
            disabled={isPending || selected.size === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            選んだ会議を確認して公開（{selected.size}）
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelected(
                selected.size === selectable.length
                  ? new Set()
                  : new Set(selectable.map((m) => m.id))
              )
            }
          >
            {selected.size === selectable.length
              ? "選択を外す"
              : "仮登録をすべて選ぶ"}
          </Button>
        </div>
      )}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>日付・時刻</TableHead>
              <TableHead>会議</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.map((meeting) => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                selected={selected.has(meeting.id)}
                onSelect={(checked) => {
                  const next = new Set(selected);
                  if (checked) next.add(meeting.id);
                  else next.delete(meeting.id);
                  setSelected(next);
                }}
                run={run}
                isPending={isPending}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
