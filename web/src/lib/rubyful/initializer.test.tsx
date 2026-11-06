// @vitest-environment jsdom
import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { toPublicSiteSettings } from "@mirai-gikai/shared/site-settings/public";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSettingsProvider } from "@/lib/site-settings/provider";
import { RubyfulInitializer } from "./initializer";

const sendGAEventMock = vi.hoisted(() => vi.fn());

vi.mock("@next/third-parties/google", () => ({
  sendGAEvent: sendGAEventMock,
}));
vi.mock("next/script", () => ({
  default: () => null,
}));

beforeEach(() => {
  localStorage.clear();
  sendGAEventMock.mockClear();
});

describe("RubyfulInitializer", () => {
  it("マウント時にふりがな表示の現在値をGAへ送る", () => {
    localStorage.setItem("rubyful-enabled", "true");
    render(<RubyfulInitializer />);

    expect(sendGAEventMock).toHaveBeenCalledWith("event", "furigana_state", {
      enabled: true,
    });
  });

  it("localStorage未設定時はfalseで送る", () => {
    render(<RubyfulInitializer />);

    expect(sendGAEventMock).toHaveBeenCalledWith("event", "furigana_state", {
      enabled: false,
    });
  });

  it("最初から表示する設定なら、未保存の人は true で送る", () => {
    const base = toPublicSiteSettings(DEFAULT_SITE_SETTINGS);
    render(
      <SiteSettingsProvider
        value={{
          ...base,
          features: { ...base.features, furigana_default_on: true },
        }}
      >
        <RubyfulInitializer />
      </SiteSettingsProvider>
    );

    expect(sendGAEventMock).toHaveBeenCalledWith("event", "furigana_state", {
      enabled: true,
    });
  });

  it("ふりがなを使わない設定なら、何も送らない", () => {
    localStorage.setItem("rubyful-enabled", "true");
    const base = toPublicSiteSettings(DEFAULT_SITE_SETTINGS);
    render(
      <SiteSettingsProvider
        value={{ ...base, features: { ...base.features, furigana: false } }}
      >
        <RubyfulInitializer />
      </SiteSettingsProvider>
    );

    expect(sendGAEventMock).not.toHaveBeenCalled();
  });
});
