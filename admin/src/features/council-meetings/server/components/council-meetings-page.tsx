import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CouncilMeetingTable } from "../../client/components/council-meeting-table";
import { FetchCalendarButton } from "../../client/components/fetch-calendar-button";
import {
  MEETING_LIST_VIEW_LABELS,
  type MeetingListView,
} from "../../shared/utils/meeting-views";
import { loadCouncilMeetingsPage } from "../loaders/load-council-meetings";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const STATUS_LABELS: Record<string, string> = {
  running: "取得中",
  succeeded: "成功",
  failed: "失敗",
  skipped: "スキップ",
};

/** 管理画面「会議予定」。公式サイトからの仮登録と、確認して公開 */
export async function CouncilMeetingsPage({ view }: { view: MeetingListView }) {
  const { meetings, reviewCount, latestRun, calendarSource, autoFetch } =
    await loadCouncilMeetingsPage(view);

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold">会議予定</h1>
        <p className="text-sm text-gray-500">
          公開サイトの「会議の予定」（カレンダー）とトップの「これからの会議」に出す会議です。
          議会サイトのカレンダーから自動で取得した会議は「仮登録」で入り、公開されません。
          日付・会議名・時刻・場所を公式サイトで確かめてから「確認して公開」してください。
        </p>
      </div>

      <section className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-white p-4">
        <div className="space-y-1 text-sm">
          <div>
            取得元：
            {calendarSource ? (
              <code className="text-xs">{calendarSource}</code>
            ) : (
              <span className="text-red-700">
                未設定（「サイト設定」→「取込」または「リンク」の議会の公式サイト）
              </span>
            )}
          </div>
          <div className="text-gray-600">
            自動取得：
            {autoFetch
              ? "毎日 朝6時ごろ（今月から3か月分。admin の Vercel に CRON_SECRET が必要）"
              : "オフ（サイト設定「取込」で変えられます）"}
          </div>
          {latestRun && (
            <div className="text-gray-600">
              最後の取得：{formatDateTime(latestRun.started_at)}（
              {latestRun.triggered_by ? "手動" : "自動"}・
              {STATUS_LABELS[latestRun.status] ?? latestRun.status}
              {latestRun.status === "succeeded" &&
                `・仮登録 ${Number(latestRun.summary.added ?? 0)} 件・変更あり ${Number(latestRun.summary.changed ?? 0)} 件`}
              ）
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <FetchCalendarButton disabled={!calendarSource} />
          <Button variant="outline" asChild>
            <Link href={routes.councilMeetingNew() as Route}>
              <Plus className="mr-2 h-4 w-4" />
              手で登録
            </Link>
          </Button>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {(Object.keys(MEETING_LIST_VIEW_LABELS) as MeetingListView[]).map(
          (key) => (
            <Link
              key={key}
              href={
                (key === "review"
                  ? routes.councilMeetings()
                  : `${routes.councilMeetings()}?view=${key}`) as Route
              }
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                key === view
                  ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {MEETING_LIST_VIEW_LABELS[key]}
              {key === "review" && `（${reviewCount}）`}
            </Link>
          )
        )}
      </nav>

      <CouncilMeetingTable meetings={meetings} />
    </div>
  );
}
