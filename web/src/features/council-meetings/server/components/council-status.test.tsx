// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { SiteSettings } from "@mirai-gikai/shared/site-settings/schema";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CouncilStatus } from "./council-status";

const mocks = vi.hoisted(() => ({
  settings: null as SiteSettings | null,
}));

// サイト設定は DB を読むので、テストごとに差し替える
vi.mock("@/lib/site-settings/loader", () => ({
  getSiteSettings: async () => mocks.settings,
}));

async function sagamihara(): Promise<SiteSettings> {
  const { SAGAMIHARA_PRESET } = await import(
    "@mirai-gikai/shared/site-settings/presets"
  );
  return SAGAMIHARA_PRESET;
}

async function generic(): Promise<SiteSettings> {
  const { DEFAULT_SITE_SETTINGS } = await import(
    "@mirai-gikai/shared/site-settings/defaults"
  );
  return DEFAULT_SITE_SETTINGS;
}

const december = {
  name: "12月定例会議",
  start_date: "2026-11-26",
  end_date: "2026-12-18",
};

describe("CouncilStatus", () => {
  it("通年議会: 定例会議の間は制度名と「次の定例会議 開会まで○日」を出す", async () => {
    mocks.settings = await sagamihara();
    render(
      await CouncilStatus({
        status: {
          councilYear: 2026,
          currentPeriod: null,
          nextPeriod: december,
        },
        todayMeetings: [],
        nextMeetings: [],
        today: "2026-11-05",
      })
    );

    expect(screen.getByText("本日は")).toBeInTheDocument();
    expect(screen.getByText("会期中（定例会議の間）")).toBeInTheDocument();
    expect(screen.getByText("令和8年度")).toBeInTheDocument();
    expect(screen.getByText("次の定例会議")).toBeInTheDocument();
    expect(screen.getByText("12月定例会議")).toBeInTheDocument();
    expect(screen.getByText("開会まで")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();

    // 右上の制度名バッジと、下の「通年議会とは」の 2 か所から説明ページへ飛べる
    const systemLinks = screen.getAllByRole("link", { name: "通年議会とは" });
    expect(systemLinks).toHaveLength(2);
    for (const link of systemLinks) {
      expect(link).toHaveAttribute("href", "/council-system");
    }
    expect(systemLinks[0]).toHaveAttribute(
      "title",
      "1年を1つの会期とし、その中で年4回の定例会議を議長が招集して審議します"
    );
  });

  it("定例会議の期間中は「閉会まで○日」と進行バーを出す", async () => {
    mocks.settings = await sagamihara();
    render(
      await CouncilStatus({
        status: {
          councilYear: 2026,
          currentPeriod: december,
          nextPeriod: null,
        },
        todayMeetings: [],
        nextMeetings: [],
        today: "2026-12-01",
      })
    );

    expect(screen.getByText("12月定例会議 開催中")).toBeInTheDocument();
    expect(screen.getByText("閉会まで")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "12月定例会議の進行" })
    ).toBeInTheDocument();
    expect(screen.getByText("11.26 開会")).toBeInTheDocument();
    expect(screen.getByText("12.18 閉会")).toBeInTheDocument();
  });

  it("制度名が空（既定の定例会制）なら制度の表示とリンクを出さず「閉会中」にする", async () => {
    mocks.settings = await generic();
    render(
      await CouncilStatus({
        status: { councilYear: 2026, currentPeriod: null, nextPeriod: null },
        todayMeetings: [],
        nextMeetings: [],
        today: "2026-11-05",
      })
    );

    expect(screen.getByText("閉会中")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((l) => l.getAttribute("href") === "/council-system")
    ).toBe(false);
  });
});
