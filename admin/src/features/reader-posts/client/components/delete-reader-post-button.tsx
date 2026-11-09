"use client";

import { Trash2 } from "lucide-react";
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

/**
 * 意見・質問の「削除」ボタン。確かめる画面を出してから消す（元に戻せない）。
 * 実際に消す処理は onDelete（カード側）で行う。
 */
export function DeleteReaderPostButton({
  label,
  body,
  isPublished,
  disabled,
  onDelete,
}: {
  /** 「質問」「意見」など */
  label: string;
  /** 確かめる画面に出す本文 */
  body: string;
  isPublished: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          className="text-red-600 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="size-4" />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この{label}を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            本文・返信先・返事など、この投稿に関するものがすべて消え、元に戻せません。
            {isPublished && "公開中のため、サイトからもすぐに消えます。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="line-clamp-5 whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm text-gray-900">
          {body}
        </p>
        <p className="text-xs leading-relaxed text-gray-500">
          違法な内容（児童ポルノなど）やそれへのリンクは、削除する前に、警察庁のインターネット・ホットラインセンターなどへの通報もご検討ください。
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
