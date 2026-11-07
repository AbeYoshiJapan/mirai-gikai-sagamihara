"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import {
  applyQuestionPendingUpdateAction,
  dismissQuestionPendingUpdateAction,
} from "../../server/actions/council-question-actions";
import type { AdminCouncilQuestion } from "../../shared/types";
import { formatItemsOutline } from "../../shared/utils/items-outline";
import {
  diffOutlines,
  type OutlineDiffLine,
} from "../../shared/utils/outline-diff";

function headerLine(fields: {
  memberName: string;
  factionLabel: string;
  method: string | null;
  questionDate: string | null;
}): string {
  return `${fields.memberName}（${fields.factionLabel}）${fields.method ?? ""}${fields.questionDate ? ` ${fields.questionDate}` : ""}`;
}

/** 行ごとに出し、もう片方と違う行に色を付ける */
function DiffPanel({
  title,
  lines,
  tone,
}: {
  title: string;
  lines: OutlineDiffLine[];
  tone: "before" | "after";
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-orange-900">{title}</div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded border bg-white p-2 text-xs">
        {lines.map((line, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 行は並びが変わらないので、位置で一意
            key={index}
            className={
              line.changed
                ? tone === "after"
                  ? "block bg-yellow-200"
                  : "block bg-red-100 line-through decoration-red-400"
                : "block"
            }
          >
            {line.text || " "}
          </span>
        ))}
      </pre>
    </div>
  );
}

/** 公開済み・手直しした質問で、公式の通告一覧が変わった・消えたときの知らせ */
export function QuestionPendingBanner({
  question,
}: {
  question: AdminCouncilQuestion;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pending = question.pending_update;
  if (!pending) return null;
  const diff =
    pending.kind === "changed"
      ? diffOutlines(
          [
            headerLine({
              memberName: question.member_name,
              factionLabel: question.faction_label,
              method: question.method,
              questionDate: question.question_date,
            }),
            formatItemsOutline(question.items),
          ].join("\n"),
          [
            headerLine(pending.draft),
            formatItemsOutline(pending.draft.items),
          ].join("\n")
        )
      : null;

  const apply = () =>
    startTransition(async () => {
      const result = await applyQuestionPendingUpdateAction(question.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.deleted ? "削除しました" : "公式の内容に置き換えました"
      );
      if (result.deleted) {
        router.push(
          routes.councilQuestionMeeting(question.meeting_key) as Route
        );
      } else {
        router.refresh();
      }
    });
  const dismiss = () =>
    startTransition(async () => {
      const result = await dismissQuestionPendingUpdateAction(question.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("このままにしました");
      router.refresh();
    });

  return (
    <section className="space-y-3 rounded-lg border border-orange-300 bg-orange-50 p-4">
      {pending.kind === "removed" ? (
        <p className="text-sm text-orange-900">
          この質問は、公式の通告一覧から無くなりました（取り下げや順位の入れ替えかもしれません）。
          通告一覧で確かめてから、削除するか、このままにするかを選んでください。
        </p>
      ) : (
        <>
          <p className="text-sm text-orange-900">
            公式の通告一覧の内容が変わりました。いまの内容（左）と、通告一覧の新しい内容（右）を見比べてください（違う行に色を付けています
            {diff ? `。新しい内容で違う行は ${diff.changedCount} 行` : ""}）。
            置き換えると、手直しした内容は消え、公開中なら確認の記録を付け直して公開を続けます。
          </p>
          {diff && (
            <div className="grid gap-3 md:grid-cols-2">
              <DiffPanel title="いまの内容" lines={diff.before} tone="before" />
              <DiffPanel
                title="通告一覧の新しい内容"
                lines={diff.after}
                tone="after"
              />
            </div>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={apply} disabled={isPending}>
          {pending.kind === "removed"
            ? "この質問を削除する"
            : "公式の内容に置き換える"}
        </Button>
        <Button variant="outline" onClick={dismiss} disabled={isPending}>
          このままにする
        </Button>
      </div>
    </section>
  );
}
