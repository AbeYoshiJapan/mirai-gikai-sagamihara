import type { Route } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";
import { ImportQuestionsPanel } from "../../client/components/import-questions-panel";
import { loadCouncilQuestionsHome } from "../loaders/load-council-questions";

/** 管理画面「議会での質問」。通告一覧の取込と、定例会議ごとの一覧 */
export async function CouncilQuestionsPage() {
  const { meetings, noticePageUrl, featureEnabled, nameInCouncil } =
    await loadCouncilQuestionsHome();

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold">議会での質問</h1>
        <p className="text-sm text-gray-500">
          代表質問・個人質疑・一般質問を、議会が公表する通告一覧から仮登録し、確認して公開します。
          全員を公式の順番・同じ形式で載せ、項目は通告の文言のままにします（言い換えない）。
          答弁の要旨は載せず、中継の録画と会議録へのリンクを付けます。
        </p>
      </div>

      <div className="space-y-1 rounded-lg border bg-white p-4 text-sm">
        <p>
          公開サイト：
          {featureEnabled ? (
            <span className="font-semibold text-emerald-700">
              出ています（確認して公開した質問だけ）
            </span>
          ) : (
            <span className="font-semibold text-gray-700">
              まだ出していません。最初の質問を公開したら、
              <Link
                href={`${routes.settings()}?tab=features` as Route}
                className="text-blue-700 underline"
              >
                サイト設定の「機能」
              </Link>
              で「議会での質問・テーマ」をオンにしてください
            </span>
          )}
        </p>
        <p>
          「運営者」と添える氏名：
          {nameInCouncil ? (
            <span className="font-semibold">{nameInCouncil}</span>
          ) : (
            <span className="text-gray-700">
              未設定（
              <Link
                href={`${routes.settings()}?tab=operator` as Route}
                className="text-blue-700 underline"
              >
                サイト設定の「運営者」
              </Link>
              の「議会での氏名」に、通告一覧どおりの氏名を入れてください）
            </span>
          )}
        </p>
      </div>

      <ImportQuestionsPanel noticePageUrl={noticePageUrl} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">定例会議</h2>
        {meetings.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだありません。通告一覧を取り込むと、ここに定例会議が出ます。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>定例会議</TableHead>
                <TableHead className="text-right">質問</TableHead>
                <TableHead className="text-right">公開中</TableHead>
                <TableHead className="text-right">仮登録</TableHead>
                <TableHead className="text-right">公式の変更</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting.meeting_key}>
                  <TableCell>
                    <Link
                      href={
                        routes.councilQuestionMeeting(
                          meeting.meeting_key
                        ) as Route
                      }
                      className="text-blue-700 underline"
                    >
                      {meeting.meeting_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{meeting.total}</TableCell>
                  <TableCell className="text-right">
                    {meeting.published}
                  </TableCell>
                  <TableCell className="text-right">
                    {meeting.total - meeting.published}
                  </TableCell>
                  <TableCell className="text-right">
                    {meeting.pending > 0 ? (
                      <span className="font-semibold text-orange-700">
                        {meeting.pending}
                      </span>
                    ) : (
                      0
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
