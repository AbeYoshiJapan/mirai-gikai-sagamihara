"use client";

import { Save } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { routes } from "@/lib/routes";
import { saveCouncilMeetingAction } from "../../server/actions/council-meeting-actions";
import {
  type AdminCouncilMeeting,
  type CommitteeOption,
  type CouncilMeetingInput,
  MEETING_CATEGORY_LABELS,
  type MeetingCategory,
} from "../../shared/types";

const NO_COMMITTEE = "none";

function toInput(meeting: AdminCouncilMeeting | null): CouncilMeetingInput {
  return {
    meeting_date: meeting?.meeting_date ?? "",
    end_date: meeting?.end_date ?? "",
    name: meeting?.name ?? "",
    category: meeting?.category ?? "plenary",
    committee_id: meeting?.committee_id ?? "",
    start_time: meeting?.start_time ?? "",
    place: meeting?.place ?? "",
    topic: meeting?.topic ?? "",
    session_label: meeting?.session_label ?? "",
    source_url: meeting?.source_url ?? "",
    stream_url: meeting?.stream_url ?? "",
    minutes_url: meeting?.minutes_url ?? "",
    agenda_pdf_url: meeting?.agenda_pdf_url ?? "",
    result_pdf_url: meeting?.result_pdf_url ?? "",
    // 新規・仮登録は「確認して公開」を付けて保存するのがふつう。公開中はそのまま公開
    publish: meeting ? meeting.is_published : true,
  };
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** 会議予定の新規登録・編集 */
export function CouncilMeetingForm({
  meeting,
  committees,
}: {
  meeting: AdminCouncilMeeting | null;
  committees: CommitteeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<CouncilMeetingInput>(toInput(meeting));
  const set = <K extends keyof CouncilMeetingInput>(
    key: K,
    next: CouncilMeetingInput[K]
  ) => setValue((current) => ({ ...current, [key]: next }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveCouncilMeetingAction(meeting?.id ?? null, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value.publish ? "確認済みとして公開しました" : "非公開で保存しました"
      );
      router.push(routes.councilMeetings() as Route);
      router.refresh();
    });
  };

  const text = (key: keyof CouncilMeetingInput) => ({
    id: key,
    value: String(value[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as never),
    disabled: isPending,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {meeting?.source === "site" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          議会サイトのカレンダーから自動で取得した会議です（表記：
          {meeting.site_label ?? "—"}
          ）。内容を公式サイトで確かめてから公開してください。
          保存すると、以後の自動取得で上書きされなくなります（公式サイトが変わったときは「変更あり」で知らせます）。
          <a
            href={meeting.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline"
          >
            公式サイトの詳細ページ
          </a>
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="開催日" htmlFor="meeting_date">
          <Input type="date" required {...text("meeting_date")} />
        </Field>
        <Field
          label="終了日（複数日の会議だけ）"
          htmlFor="end_date"
          hint="管外行政調査など。1 日だけなら空のまま"
        >
          <Input type="date" {...text("end_date")} />
        </Field>
        <Field label="会議名" htmlFor="name">
          <Input required placeholder="総務委員会" {...text("name")} />
        </Field>
        <Field label="区分" htmlFor="category">
          <Select
            value={value.category}
            onValueChange={(next) => set("category", next as MeetingCategory)}
            disabled={isPending}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(MEETING_CATEGORY_LABELS) as [
                  MeetingCategory,
                  string,
                ][]
              ).map(([category, label]) => (
                <SelectItem key={category} value={category}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="委員会（任意）" htmlFor="committee_id">
          <Select
            value={value.committee_id || NO_COMMITTEE}
            onValueChange={(next) =>
              set("committee_id", next === NO_COMMITTEE ? "" : next)
            }
            disabled={isPending}
          >
            <SelectTrigger id="committee_id">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COMMITTEE}>（なし）</SelectItem>
              {committees.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="会議期間（任意）"
          htmlFor="session_label"
          hint="例：12月定例会議"
        >
          <Input placeholder="12月定例会議" {...text("session_label")} />
        </Field>
        <Field label="開始時刻" htmlFor="start_time" hint="例：午前10時">
          <Input placeholder="午前10時" {...text("start_time")} />
        </Field>
        <Field label="場所" htmlFor="place" hint="例：本会議場、第1委員会室">
          <Input placeholder="本会議場" {...text("place")} />
        </Field>
      </section>

      <Field
        label="内容（任意）"
        htmlFor="topic"
        hint="議題や、主な議案など。公開サイトの会議の下に出ます"
      >
        <Textarea rows={3} {...text("topic")} />
      </Field>

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="出典（公式サイトのページ）"
          htmlFor="source_url"
          hint="空なら「サイト設定」の会議日程のページ"
        >
          <Input type="url" {...text("source_url")} />
        </Field>
        <Field label="議会中継・録画" htmlFor="stream_url">
          <Input type="url" {...text("stream_url")} />
        </Field>
        <Field label="議事日程・付議事件（PDF）" htmlFor="agenda_pdf_url">
          <Input type="url" {...text("agenda_pdf_url")} />
        </Field>
        <Field label="審議結果（PDF）" htmlFor="result_pdf_url">
          <Input type="url" {...text("result_pdf_url")} />
        </Field>
        <Field label="会議録" htmlFor="minutes_url">
          <Input type="url" {...text("minutes_url")} />
        </Field>
      </section>

      <div className="flex items-start gap-3 rounded-md border p-4">
        <Checkbox
          id="publish"
          checked={value.publish}
          onCheckedChange={(checked) => set("publish", checked === true)}
          disabled={isPending}
        />
        <div className="space-y-1">
          <Label htmlFor="publish">確認済みとして公開する</Label>
          <p className="text-xs text-gray-500">
            日付・会議名・時刻・場所を公式サイトの日程で確かめたら付けます。付けずに保存すると非公開のまま（公開サイトには出ません）。
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "保存中…" : "保存"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={routes.councilMeetings() as Route}>一覧に戻る</Link>
        </Button>
      </div>
    </form>
  );
}
