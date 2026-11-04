import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatJstDateTime } from "@/features/interview-reports/shared/utils/format-jst-date-time";
import type { ImportRunView } from "../../shared/types";

const STATUS_LABELS: Record<string, string> = {
  running: "実行中",
  succeeded: "完了",
  failed: "失敗",
  skipped: "見送り",
};

const SOURCE_LABELS: Record<string, string> = {
  agenda: "付議事件一覧",
  results: "審議結果",
};

export function ImportRunList({ runs }: { runs: ImportRunView[] }) {
  if (runs.length === 0) {
    return (
      <p className="rounded border bg-white p-6 text-sm text-gray-500">
        まだ取込はありません。
      </p>
    );
  }
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">日時</TableHead>
            <TableHead className="w-32">種類</TableHead>
            <TableHead className="w-20">状態</TableHead>
            <TableHead className="w-48">件数</TableHead>
            <TableHead>記録</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="align-top text-sm">
                {formatJstDateTime(run.started_at)}
              </TableCell>
              <TableCell className="align-top text-sm">
                {SOURCE_LABELS[run.source_id] ?? run.source_id}
                {run.dry_run && "（確認のみ）"}
              </TableCell>
              <TableCell className="align-top text-sm">
                {STATUS_LABELS[run.status] ?? run.status}
              </TableCell>
              <TableCell className="align-top text-sm">
                追加 {String(run.summary.added ?? 0)} / 更新{" "}
                {String(run.summary.updated ?? 0)} / 変更なし{" "}
                {String(run.summary.skipped ?? 0)}
                {Number(run.summary.errors ?? 0) > 0 &&
                  ` / エラー ${String(run.summary.errors)}`}
              </TableCell>
              <TableCell className="whitespace-pre-wrap align-top text-xs text-gray-600">
                {run.log}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
