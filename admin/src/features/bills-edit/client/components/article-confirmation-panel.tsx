"use client";

import { CircleAlert, CircleCheck, FileText, Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillArticleKind } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  confirmBillArticle,
  revokeBillArticleConfirmation,
} from "../../server/actions/article-confirmation";
import type { ArticleConfirmationState } from "../../shared/types/article-confirmation";

type ArticleConfirmationPanelProps = {
  billId: string;
  state: ArticleConfirmationState;
  isPublished: boolean;
  articleKind: BillArticleKind;
  /** 記事（コンテンツ編集）へのリンクを出す（コンテンツ編集画面では出さない） */
  showContentsLink?: boolean;
};

/**
 * 「記事の確認」欄。運営者が記事を一次資料と照らして確かめたことを、ボタンで意思表示する。
 * 確認済みの議案だけが公開できる（公開ゲート）。
 */
export function ArticleConfirmationPanel({
  billId,
  state,
  isPublished,
  articleKind,
  showContentsLink = false,
}: ArticleConfirmationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (
    action: (id: string) => Promise<{ error?: string }>,
    successMessage: string
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action(billId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  };

  const isAiGenerated = articleKind === "ai_generated";
  const confirmedDetail = [state.confirmedAtLabel, state.confirmedBy]
    .filter(Boolean)
    .join("・");
  const blocked = isAiGenerated || state.unresolvedCount > 0;

  return (
    <Card
      className={cn(
        state.confirmed
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {state.confirmed ? (
            <CircleCheck className="h-5 w-5 text-green-700" />
          ) : (
            <CircleAlert className="h-5 w-5 text-amber-700" />
          )}
          記事の確認
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state.confirmed ? (
          <>
            <p className="font-medium text-green-800">
              確認済み{confirmedDetail && `（${confirmedDetail}）`}
            </p>
            <p className="text-gray-700">
              公開は、議案一覧の「公開ステータス」から行います。AI
              で記事を作り直したり、外部ツール（MCP）から書き換えたりすると、確認は自動で外れます。
            </p>
            <RevokeButton
              isPublished={isPublished}
              disabled={isPending}
              onRevoke={() =>
                run(revokeBillArticleConfirmation, "確認を取り消しました")
              }
            />
          </>
        ) : (
          <>
            <p className="text-gray-700">
              記事（解説）を、議案書・会議録などの一次資料と照らして読み、内容を確かめたら押してください。確認した人と日時を記録し、公開できるようになります。
            </p>
            {isAiGenerated && (
              <p className="text-amber-800">
                記事の種別が「AI自動生成版」のままです。確かめたら、下の「記事の種別」を「通常版」にして保存してから押してください。
              </p>
            )}
            {state.unresolvedCount > 0 && (
              <p className="text-amber-800">
                AI 生成の「要確認」が {state.unresolvedCount} 件残っています。
                <Link
                  href={routes.billGenerate(billId) as Route}
                  className="underline"
                >
                  生成画面
                </Link>
                で確かめてから押してください。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  run(confirmBillArticle, "記事を確認済みにしました")
                }
                disabled={isPending || blocked}
              >
                <CircleCheck className="mr-2 h-4 w-4" />
                {isPending ? "記録しています..." : "記事を確認しました"}
              </Button>
              {showContentsLink && (
                <Button type="button" variant="outline" asChild>
                  <Link href={routes.billContentsEdit(billId) as Route}>
                    <FileText className="mr-2 h-4 w-4" />
                    記事を開く
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function RevokeButton({
  isPublished,
  disabled,
  onRevoke,
}: {
  isPublished: boolean;
  disabled: boolean;
  onRevoke: () => void;
}) {
  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={isPublished ? undefined : onRevoke}
    >
      <Undo2 className="mr-2 h-4 w-4" />
      確認を取り消す
    </Button>
  );
  if (!isPublished) return trigger;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認を取り消しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この議案は公開中です。確認を取り消すと、公開を取り下げて下書きに戻します。確かめ直して「記事を確認しました」を押してから、もう一度公開してください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>やめる</AlertDialogCancel>
          <AlertDialogAction onClick={onRevoke}>
            取り消して下書きに戻す
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
