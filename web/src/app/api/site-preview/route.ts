import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  isSitePreviewTokenValid,
  SITE_PREVIEW_COOKIE_MAX_AGE,
  SITE_PREVIEW_COOKIE_NAME,
} from "@/lib/site-preview";

/**
 * 公開前サイトの確認を始める。管理画面の「公開前のサイトを確認」リンクから呼ばれる。
 * GET /api/site-preview?token=<合言葉>[&to=/path]
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!isSitePreviewTokenValid(token, env.sitePreviewSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = request.nextUrl.searchParams.get("to") ?? "/";
  // オープンリダイレクト防止：サイト内のパスだけ許す
  const destination = to.startsWith("/") && !to.startsWith("//") ? to : "/";

  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SITE_PREVIEW_COOKIE_NAME, token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_PREVIEW_COOKIE_MAX_AGE,
  });
  return response;
}

/** 確認を終える */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SITE_PREVIEW_COOKIE_NAME);
  return response;
}
