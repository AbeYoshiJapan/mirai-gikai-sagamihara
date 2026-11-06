import { NextResponse } from "next/server";
import { importSiteCalendar } from "@/features/council-meetings/server/services/import-site-calendar";
import { isCronAuthorized } from "@/features/council-meetings/server/utils/cron-auth";
import { jstDateKey } from "@/features/council-meetings/shared/utils/meeting-rows";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";

/** 詳細ページを 1 件ずつ間を空けて読むので、数十秒かかることがある */
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * 毎日の自動取得（Vercel Cron。admin/vercel.json の crons）。
 * 議会サイトのカレンダーから会議予定を読み、仮登録する。公開はしない。
 * Vercel は環境変数 CRON_SECRET を Authorization: Bearer で送ってくる。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET が設定されていないため、自動取得は止めています" },
      { status: 503 }
    );
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { settings } = await loadSiteSettings();
  if (!settings.import.calendar_auto_fetch) {
    return NextResponse.json({
      skipped: "サイト設定で自動取得をオフにしています",
    });
  }

  const result = await importSiteCalendar({
    triggeredBy: null,
    today: jstDateKey(),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
