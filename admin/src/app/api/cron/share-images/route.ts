import { NextResponse } from "next/server";
import { runMorningShareImageRefresh } from "@/features/bills-edit/server/services/share-image-refresh";
import { isCronAuthorized } from "@/features/council-meetings/server/utils/cron-auth";

/** 画像を 1 枚ずつ作るので、数が多いと数十秒かかる */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 朝の見直し（Vercel Cron。admin/vercel.json の crons）。
 * サイト名を変えて保存したときに作り直しきれなかったシェア画像（時間切れ・失敗）があるときだけ、
 * いまのサイト名で作り直す。サイト名の変更が無ければ、何も読まずにすぐ終わる。
 * 手でアップロードした画像には触れない。
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

  const result = await runMorningShareImageRefresh();
  const failed = result.status === "ran" && result.failed > 0;
  return NextResponse.json(result, { status: failed ? 500 : 200 });
}
