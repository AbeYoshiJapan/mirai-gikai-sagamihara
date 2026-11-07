"use client";

import { Check, ExternalLink, Save, Trash2, Undo2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  confirmCouncilQuestionsAction,
  deleteCouncilQuestionAction,
  saveCouncilQuestionAction,
  unpublishCouncilQuestionAction,
} from "../../server/actions/council-question-actions";
import {
  type AdminCouncilQuestion,
  COUNCIL_QUESTION_KIND_LABELS,
  COUNCIL_QUESTION_KIND_ORDER,
  type CouncilQuestionKind,
  type QuestionThemeLink,
  type ThemeOption,
} from "../../shared/types";
import {
  formatItemsOutline,
  parseItemsOutline,
} from "../../shared/utils/items-outline";

const METHODS = ["", "一括", "一問一答", "一括・一問一答"];

/** 質問 1 件の確認・手直し・テーマのひも付け・公開 */
export function QuestionEditForm({
  question,
  themeOptions,
  themeLinks,
}: {
  question: AdminCouncilQuestion;
  themeOptions: ThemeOption[];
  themeLinks: QuestionThemeLink[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<CouncilQuestionKind>(question.kind);
  const [seatNumber, setSeatNumber] = useState(
    question.seat_number?.toString() ?? ""
  );
  const [memberName, setMemberName] = useState(question.member_name);
  const [factionLabel, setFactionLabel] = useState(question.faction_label);
  const [method, setMethod] = useState(question.method ?? "");
  const [questionDate, setQuestionDate] = useState(
    question.question_date ?? ""
  );
  const [streamUrl, setStreamUrl] = useState(question.stream_url ?? "");
  const [minutesUrl, setMinutesUrl] = useState(question.minutes_url ?? "");
  const [outline, setOutline] = useState(formatItemsOutline(question.items));
  const [links, setLinks] = useState<QuestionThemeLink[]>(themeLinks);

  const parsedOutline = useMemo(() => parseItemsOutline(outline), [outline]);
  const topItems = parsedOutline.ok ? parsedOutline.items : question.items;

  const hasLink = (itemNumber: number, tagId: string) =>
    links.some((l) => l.item_number === itemNumber && l.tag_id === tagId);
  const toggleLink = (itemNumber: number, tagId: string) => {
    setLinks((current) =>
      hasLink(itemNumber, tagId)
        ? current.filter(
            (l) => !(l.item_number === itemNumber && l.tag_id === tagId)
          )
        : [...current, { item_number: itemNumber, tag_id: tagId }]
    );
  };

  const run = (
    action: () => Promise<{ error?: string }>,
    success: string,
    after?: () => void
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      if (after) after();
      else router.refresh();
    });
  };

  const input = {
    kind,
    seatNumber: seatNumber.trim() ? Number.parseInt(seatNumber, 10) : null,
    memberName,
    factionLabel,
    method,
    questionDate,
    streamUrl,
    minutesUrl,
    itemsOutline: outline,
    themeLinks: [...links].sort(
      (a, b) =>
        a.item_number - b.item_number || a.tag_id.localeCompare(b.tag_id)
    ),
  };
  const [initialInput] = useState(() => JSON.stringify(input));
  const isDirty = JSON.stringify(input) !== initialInput;

  const save = () =>
    run(() => saveCouncilQuestionAction(question.id, input), "保存しました");

  /** 直したところがあれば保存してから公開する（直していなければ公開だけ） */
  const confirmAndPublish = () =>
    run(async () => {
      if (isDirty) {
        const saved = await saveCouncilQuestionAction(question.id, input);
        if (saved.error) return saved;
      }
      return confirmCouncilQuestionsAction([question.id]);
    }, "確認して公開しました");

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>区分</Label>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as CouncilQuestionKind)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNCIL_QUESTION_KIND_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {COUNCIL_QUESTION_KIND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>順位</Label>
          <Input value={question.order_no} disabled />
        </div>
        <div className="space-y-1">
          <Label htmlFor="member-name">氏名</Label>
          <Input
            id="member-name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="faction">会派（通告一覧の略称）</Label>
          <Input
            id="faction"
            value={factionLabel}
            onChange={(e) => setFactionLabel(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="seat">議席番号</Label>
          <Input
            id="seat"
            inputMode="numeric"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>質問方式</Label>
          <Select
            value={method || "none"}
            onValueChange={(value) => setMethod(value === "none" ? "" : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((value) => (
                <SelectItem key={value || "none"} value={value || "none"}>
                  {value || "（書かない）"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="question-date">質問日</Label>
          <Input
            id="question-date"
            type="date"
            value={questionDate}
            onChange={(e) => setQuestionDate(e.target.value)}
          />
        </div>
        <div />
        <div className="space-y-1">
          <Label htmlFor="stream-url">中継の録画の URL（質問日のあとに）</Label>
          <Input
            id="stream-url"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="minutes-url">会議録の URL（公開されたら）</Label>
          <Input
            id="minutes-url"
            value={minutesUrl}
            onChange={(e) => setMinutesUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
      </section>

      <section className="space-y-2 rounded-lg border bg-white p-4">
        <Label htmlFor="items">項目（通告の文言のまま。1 行に 1 項目）</Label>
        <p className="text-xs text-gray-500">
          行の頭に「1」「(1)」「ア」「（ア）」を書くと、その段の項目になります（字下げは見やすさのためだけ）。
          読み取りで崩れたところだけ直し、文言は言い換えないでください。
        </p>
        <Textarea
          id="items"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          rows={Math.min(30, Math.max(8, outline.split("\n").length + 1))}
          className="font-mono text-sm"
        />
        {!parsedOutline.ok && (
          <p className="text-sm text-red-700">{parsedOutline.error}</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div>
          <h2 className="font-semibold">テーマ</h2>
          <p className="text-xs text-gray-500">
            大きな項目ごとに、関係するテーマを選びます（テーマのページの「議会での質問」に出ます）。
            テーマは「タグ管理」で作り、「テーマのページを公開する」をオンにすると公開サイトに出ます。
          </p>
        </div>
        {themeOptions.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだテーマ（タグ）がありません。
          </p>
        ) : (
          topItems.map((item) => {
            const itemNumber = Number.parseInt(item.label, 10);
            return (
              <div key={item.label} className="space-y-1">
                <div className="text-sm font-medium">
                  {item.label} {item.text}
                </div>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((theme) => {
                    const active = hasLink(itemNumber, theme.id);
                    return (
                      <Button
                        key={theme.id}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className={cn("h-7 rounded-full px-3 text-xs", {
                          "opacity-70": !theme.is_theme && !active,
                        })}
                        aria-pressed={active}
                        onClick={() => toggleLink(itemNumber, theme.id)}
                      >
                        {theme.label}
                        {!theme.is_theme && "（非公開）"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={save}
          disabled={isPending || !parsedOutline.ok || !isDirty}
        >
          <Save className="mr-2 h-4 w-4" />
          保存
        </Button>
        {question.is_published ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(
                () => unpublishCouncilQuestionAction(question.id),
                "公開をやめました"
              )
            }
          >
            <Undo2 className="mr-2 h-4 w-4" />
            公開をやめる
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={isPending || !parsedOutline.ok}
            onClick={confirmAndPublish}
          >
            <Check className="mr-2 h-4 w-4" />
            {isDirty ? "保存して公開" : "確認して公開"}
          </Button>
        )}
        {question.source_url && (
          <Button variant="ghost" asChild>
            <a href={question.source_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              通告一覧の PDF
            </a>
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="ml-auto text-red-700"
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>この質問を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                公開中なら公開サイトからも消えます。通告一覧をもう一度取り込むと、仮登録で戻ります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>やめる</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(
                    () => deleteCouncilQuestionAction(question.id),
                    "削除しました",
                    () =>
                      router.push(
                        routes.councilQuestionMeeting(
                          question.meeting_key
                        ) as Route
                      )
                  )
                }
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
