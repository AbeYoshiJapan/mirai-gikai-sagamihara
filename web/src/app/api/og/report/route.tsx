import { join } from "node:path";
import {
  buildOgFontOptions,
  loadBundledFont,
  loadOgpLogoDataUrl,
} from "@mirai-gikai/shared/og/assets";
import { ImageResponse } from "next/og";
import { getReportOgData } from "@/features/interview-report/server/loaders/get-report-og-data";
import { truncateText } from "@/features/interview-report/shared/utils/truncate-text";
import { getSiteSettings, isFeatureEnabled } from "@/lib/site-settings/loader";

// next.config の outputFileTracingIncludes と同じパスを指す
const OGP_LOGO_PATH = join(
  process.cwd(),
  "../packages/shared/src/og/ogp-logo.png"
);
// 同梱フォント（Google Fonts には取りに行かない）
const FONT_PATH = join(
  process.cwd(),
  "src/assets/fonts/noto-sans-jp-japanese-700.woff"
);

/**
 * OGP画像のテキスト制限
 */
const OG_SUMMARY_MAX_LENGTH = 100;
const OG_BILL_NAME_MAX_LENGTH = 40;
const OG_BILL_NAME_WIDTH = 820;
const OG_BILL_NAME_MAX_HEIGHT = 96;

export async function GET(request: Request) {
  if (!(await isFeatureEnabled("ai_interview"))) {
    return new Response(null, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");

  if (!reportId) {
    return new Response("Missing id parameter", { status: 400 });
  }

  let data: Awaited<ReturnType<typeof getReportOgData>>;
  try {
    data = await getReportOgData(reportId);
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
  if (!data) {
    return new Response("Report not found", { status: 404 });
  }

  const truncatedSummary = truncateText(data.summary, OG_SUMMARY_MAX_LENGTH);
  const truncatedBillName = truncateText(
    data.billName,
    OG_BILL_NAME_MAX_LENGTH
  );

  const [fontData, logoDataUrl, { site }] = await Promise.all([
    loadBundledFont(FONT_PATH),
    loadOgpLogoDataUrl(OGP_LOGO_PATH),
    getSiteSettings(),
  ]);
  // 同梱は 700 だけ。スタイルの 800 指定には一番近い 700 が使われる
  const fontOptions = buildOgFontOptions(fontData, 700);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage:
          "linear-gradient(177deg, rgb(243, 247, 252) 0%, rgb(212, 228, 246) 100%)",
      }}
    >
      {/* グラデーションborder用ラッパー */}
      <div
        style={{
          display: "flex",
          width: 1140,
          height: 560,
          borderRadius: 30,
          backgroundImage:
            "linear-gradient(-30deg, rgb(141, 180, 230) 1%, rgb(42, 94, 168) 99%)",
          padding: 6,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            borderRadius: 24,
            padding: "48px 56px",
          }}
        >
          {/* サマリーテキスト */}
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 800,
              color: "#1f2937",
              lineHeight: 1.8,
              flex: 1,
              width: 740,
              overflow: "hidden",
            }}
          >
            {truncatedSummary}
          </div>

          {/* 議案名 */}
          <div
            style={{
              display: "flex",
              width: OG_BILL_NAME_WIDTH,
              maxHeight: OG_BILL_NAME_MAX_HEIGHT,
              fontSize: 32,
              fontWeight: 800,
              color: "#2a5ea8",
              lineHeight: 1.5,
              overflow: "hidden",
              wordBreak: "break-all",
            }}
          >
            {truncatedBillName}
          </div>
        </div>

        {/* みらい議会バッジ */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 20,
            paddingRight: 18,
            paddingTop: 10,
            paddingBottom: 10,
            borderBottomLeftRadius: 30,
            borderTopRightRadius: 30,
            backgroundImage:
              "linear-gradient(-30deg, rgb(212, 228, 246) 1%, rgb(141, 180, 230) 99%)",
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#1f2937",
              letterSpacing: "0.03em",
            }}
          >
            {site.name}
          </span>
        </div>

        {/* ロゴ画像 */}
        {logoDataUrl && (
          // biome-ignore lint/performance/noImgElement: ignore
          <img
            alt={`${site.name}のロゴ`}
            src={logoDataUrl}
            width={189}
            height={160}
            style={{
              position: "absolute",
              bottom: -24,
              right: -18,
            }}
          />
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      ...fontOptions,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
