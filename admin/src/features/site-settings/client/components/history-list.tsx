"use client";

import { History, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { restoreSiteSettingsHistory } from "../../server/actions/restore-site-settings-history";

export type HistoryEntry = {
  id: number;
  changed_at: string;
  value: unknown;
};

interface HistoryListProps {
  entries: HistoryEntry[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/**
 * セクションの変更履歴。各版の JSON を確認し、その版に戻せる。
 */
export function HistoryList({ entries }: HistoryListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  if (entries.length === 0) return null;

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      const result = await restoreSiteSettingsHistory(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("この版に戻しました");
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="rounded-md border bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-gray-700"
      >
        <History className="h-4 w-4" />
        変更履歴（{entries.length} 件）
        <span className="ml-auto text-xs text-gray-500">
          {open ? "閉じる" : "開く"}
        </span>
      </button>
      {open && (
        <ul className="divide-y border-t">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">
                  {formatDateTime(entry.changed_at)} までの値
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={restoringId !== null}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      この版に戻す
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>この版に戻しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        現在の値も履歴に残るので、あとから戻せます。公開サイトにはすぐ反映されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRestore(entry.id)}
                      >
                        戻す
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-xs text-gray-600">
                {JSON.stringify(entry.value, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
