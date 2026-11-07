"use client";

import { Check, ExternalLink, Pencil } from "lucide-react";
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
import { formatDateWithWeekday } from "@/features/council-meetings/shared/utils/meeting-views";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { confirmCouncilQuestionsAction } from "../../server/actions/council-question-actions";
import type { AdminCouncilQuestion } from "../../shared/types";
import {
  getQuestionReviewState,
  QUESTION_REVIEW_STATE_LABELS,
  type QuestionReviewState,
} from "../../shared/utils/question-review-state";

const STATE_BADGE_CLASS: Record<QuestionReviewState, string> = {
  provisional: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  changed: "bg-orange-100 text-orange-900 hover:bg-orange-100",
  removed: "bg-red-100 text-red-900 hover:bg-red-100",
  published: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
};

/** 定例会議の質問の一覧。PDF と見比べたものを選んで「確認して公開」できる */
export function QuestionTable({
  questions,
}: {
  questions: AdminCouncilQuestion[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectable = questions.filter((q) => !q.is_published);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const confirmSelected = () => {
    startTransition(async () => {
      const result = await confirmCouncilQuestionsAction([...selected]);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.confirmed} 件を確認して公開しました`);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={confirmSelected}
          disabled={isPending || selected.size === 0}
        >
          <Check className="mr-2 h-4 w-4" />
          選んだ質問を確認して公開（{selected.size}）
        </Button>
        {selectable.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelected(
                selected.size === selectable.length
                  ? new Set()
                  : new Set(selectable.map((q) => q.id))
              )
            }
          >
            {selected.size === selectable.length
              ? "選択を外す"
              : "仮登録をすべて選ぶ"}
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead className="w-14">順位</TableHead>
            <TableHead>質問者</TableHead>
            <TableHead>方式・質問日</TableHead>
            <TableHead>項目</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question) => {
            const state = getQuestionReviewState(question);
            return (
              <TableRow key={question.id}>
                <TableCell>
                  {!question.is_published && (
                    <Checkbox
                      checked={selected.has(question.id)}
                      onCheckedChange={(checked) =>
                        toggle(question.id, checked === true)
                      }
                      aria-label={`${question.member_name}さんの質問を選ぶ`}
                    />
                  )}
                </TableCell>
                <TableCell>{question.order_no}</TableCell>
                <TableCell>
                  <div className="font-medium">{question.member_name}</div>
                  <div className="text-xs text-gray-500">
                    {question.faction_label}
                    {question.seat_number ? `・${question.seat_number}番` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{question.method ?? "—"}</div>
                  <div className="text-xs text-gray-500">
                    {question.question_date
                      ? formatDateWithWeekday(question.question_date)
                      : "質問日 未定"}
                  </div>
                </TableCell>
                <TableCell className="max-w-md text-sm">
                  <ol className="space-y-0.5">
                    {question.items.map((item) => (
                      <li
                        key={`${item.label}-${item.text}`}
                        className="truncate"
                      >
                        {item.label} {item.text}
                      </li>
                    ))}
                  </ol>
                </TableCell>
                <TableCell>
                  <Badge className={cn(STATE_BADGE_CLASS[state])}>
                    {QUESTION_REVIEW_STATE_LABELS[state]}
                  </Badge>
                  {question.operator_edited_at && (
                    <div className="mt-1 text-xs text-gray-500">手直しあり</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={
                          routes.councilQuestionEdit(
                            question.meeting_key,
                            question.id
                          ) as Route
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">確認・編集</span>
                      </Link>
                    </Button>
                    {question.source_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={question.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">通告一覧の PDF</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
