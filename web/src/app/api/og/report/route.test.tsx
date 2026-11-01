import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getReportOgData } from "@/features/interview-report/server/loaders/get-report-og-data";
import { GET } from "./route";

type StyledElementProps = {
  children?: ReactNode;
  style?: Record<string, unknown>;
};

const mocks = vi.hoisted(() => ({
  getReportOgData: vi.fn(),
  imageResponse: vi.fn(
    (element: ReactElement, _init: ConstructorParameters<typeof Response>[1]) =>
      new Response(JSON.stringify(element), { status: 200 })
  ),
}));

vi.mock(
  "@/features/interview-report/server/loaders/get-report-og-data",
  () => ({
    getReportOgData: mocks.getReportOgData,
  })
);

vi.mock("next/og", () => ({
  ImageResponse: mocks.imageResponse,
}));

// サイト設定は DB を読むので、テストでは既定値（AIインタビューだけ有効）に固定する
vi.mock("@/lib/site-settings/loader", async () => {
  const { DEFAULT_SITE_SETTINGS } = await import(
    "@mirai-gikai/shared/site-settings/defaults"
  );
  const settings = {
    ...DEFAULT_SITE_SETTINGS,
    features: { ...DEFAULT_SITE_SETTINGS.features, ai_interview: true },
  };
  return {
    getSiteSettings: async () => settings,
    isFeatureEnabled: async (flag: keyof typeof settings.features) =>
      settings.features[flag],
  };
});

function findBillNameElement(
  node: ReactNode,
  text: string
): ReactElement<StyledElementProps> | null {
  if (!node || typeof node !== "object" || !("props" in node)) {
    return null;
  }

  const element = node as ReactElement<StyledElementProps>;
  if (
    element.props.children === text &&
    element.props.style?.color === "#2a5ea8"
  ) {
    return element;
  }

  const children = element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findBillNameElement(child, text);
      if (found) return found;
    }
    return null;
  }

  return findBillNameElement(children, text);
}

describe("GET /api/og/report", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("長い法案名をロゴ領域に重ならない幅で描画する", async () => {
    const billName =
      "ロケットの打上げルールを見直して、日本の宇宙産業を強化するための法案";
    vi.mocked(getReportOgData).mockResolvedValue({
      summary:
        "試験打上げまで許可対象を広げるなら、手続きはシンプルにしてほしい",
      billName,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 }))
    );

    await GET(new Request("http://localhost/api/og/report?id=report-1"));

    expect(mocks.imageResponse).toHaveBeenCalledTimes(1);
    const [element] = mocks.imageResponse.mock.calls[0];
    const billNameElement = findBillNameElement(element, billName);

    expect(billNameElement?.props.style).toMatchObject({
      width: 820,
      maxHeight: 96,
      overflow: "hidden",
      wordBreak: "break-all",
    });
  });
});
