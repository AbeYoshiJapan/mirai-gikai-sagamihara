import { NextResponse } from "next/server";
import { refreshShareImagesForSiteName } from "@/features/bills-edit/server/services/share-image-refresh";
import { isCronAuthorized } from "@/features/council-meetings/server/utils/cron-auth";

/** 画像を 1 枚ずつ作るので、数が多いと数十秒かかる */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 毎日の見直し（Vercel Cron。admin/vercel.json の crons）。
 * サイト設定を保存したときにも作り直すが、そのときに時間切れや失敗で残ったシェア画像を、
 * いまのサイト名で作り直す。手でアップロードした画像には触れない。
 * Vercel は環境変数 CRON_SECRET を Authorization: Bearer で送ってくる。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET が設定されていないため、自動処理は止めています" },
      { status: 503 }
    );
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshShareImagesForSiteName({ budgetMs: 50_000 });
  return NextResponse.json(result, { status: result.failed > 0 ? 500 : 200 });
}
