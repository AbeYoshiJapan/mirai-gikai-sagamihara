// @vitest-environment jsdom
import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import {
  type PublicSiteSettings,
  toPublicSiteSettings,
} from "@mirai-gikai/shared/site-settings/public";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteSettingsProvider } from "@/lib/site-settings/provider";
import { HamburgerMenu } from "./hamburger-menu";

vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));

const base = toPublicSiteSettings(DEFAULT_SITE_SETTINGS);

function renderMenu(features: Partial<PublicSiteSettings["features"]>) {
  const settings = { ...base, features: { ...base.features, ...features } };
  render(
    <SiteSettingsProvider value={settings}>
      <HamburgerMenu />
    </SiteSettingsProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
}

describe("HamburgerMenu", () => {
  it("ふりがなを使える設定なら、メニューに切り替えを出す", () => {
    renderMenu({ furigana: true });
    expect(screen.getByText("ふりがな表示")).toBeTruthy();
  });

  it("ふりがなを使わない設定なら、切り替えを出さない", () => {
    renderMenu({ furigana: false });
    expect(screen.queryByText("ふりがな表示")).toBeNull();
    expect(screen.getByText("掲載方針")).toBeTruthy();
  });

  it("会議日程の機能が有効なときだけ、会議の予定（カレンダー）へのリンクを出す", () => {
    renderMenu({ schedule: true });
    expect(
      screen.getByRole("link", { name: "会議の予定（カレンダー）" })
    ).toBeTruthy();
  });

  it("議会での質問の機能が有効なときだけ、議会での質問とテーマへのリンクを出す", () => {
    renderMenu({ council_questions: true });
    expect(screen.getByRole("link", { name: "議会での質問" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "テーマ" })).toBeTruthy();
  });

  it("議会での質問の機能が無効なら、議会での質問とテーマへのリンクを出さない", () => {
    renderMenu({ council_questions: false });
    expect(screen.queryByRole("link", { name: "議会での質問" })).toBeNull();
    expect(screen.queryByRole("link", { name: "テーマ" })).toBeNull();
  });

  it("会議日程の機能が無効なら、カレンダーへのリンクを出さない", () => {
    renderMenu({ schedule: false });
    expect(
      screen.queryByRole("link", { name: "会議の予定（カレンダー）" })
    ).toBeNull();
  });
});
