// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { SAGAMIHARA_PRESET } from "@mirai-gikai/shared/site-settings/presets";
import type { SiteSettings } from "@mirai-gikai/shared/site-settings/schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSettingsTabs } from "./site-settings-tabs";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
  saveSiteSettingsSection: vi.fn(),
  restoreSiteSettingsHistory: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("../../server/actions/save-site-settings-section", () => ({
  saveSiteSettingsSection: mocks.saveSiteSettingsSection,
}));

vi.mock("../../server/actions/restore-site-settings-history", () => ({
  restoreSiteSettingsHistory: mocks.restoreSiteSettingsHistory,
}));

vi.mock("../../server/actions/upload-site-asset", () => ({
  uploadSiteAsset: vi.fn(),
}));

const settings: SiteSettings = {
  ...SAGAMIHARA_PRESET,
  site: { ...SAGAMIHARA_PRESET.site, canonical_url: "https://web.example" },
  links: {
    ...SAGAMIHARA_PRESET.links,
    fork_repo: "https://github.com/example/mirai-gikai-sagamihara",
  },
  operator: { ...SAGAMIHARA_PRESET.operator, name: "相模原 太郎" },
};

function renderTabs(overrides: Partial<SiteSettings> = {}, tab?: string) {
  mocks.searchParams = new URLSearchParams(tab ? { tab } : {});
  const merged = { ...settings, ...overrides };
  return render(
    <SiteSettingsTabs
      settings={merged}
      storedSections={["site", "council"]}
      invalidSections={[]}
      updatedAt={{ site: "2026-11-01T00:00:00Z" }}
      history={{
        site: [
          {
            id: 1,
            changed_at: "2026-10-31T00:00:00Z",
            value: { name: "古い名前" },
          },
        ],
      }}
      previewUrl="https://web.example/api/site-preview?token=x"
      webUrl="https://web.example"
    />
  );
}

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.refresh.mockReset();
  mocks.saveSiteSettingsSection.mockReset();
  mocks.restoreSiteSettingsHistory.mockReset();
  window.scrollTo = vi.fn();
});

describe("SiteSettingsTabs", () => {
  it("必須項目がそろっていれば点検は合格、未公開なら案内を出す", () => {
    renderTabs();
    expect(screen.getByText(/必須項目はそろっています/)).toBeInTheDocument();
    expect(screen.getByText(/まだ公開されていません/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /公開前のサイトを確認/ })
    ).toHaveAttribute("href", "https://web.example/api/site-preview?token=x");
  });

  it("本家の色を使っていると点検で指摘され、該当タブに赤い印が付く", () => {
    renderTabs({
      brand: {
        ...settings.brand,
        colors: { ...settings.brand.colors, primary: "#2aa693" },
      },
    });
    expect(screen.getByText(/テーマ色が本家/)).toBeInTheDocument();
    const brandTab = screen.getByRole("tab", { name: /ブランド/ });
    expect(within(brandTab).getByText("（要確認）")).toBeInTheDocument();
  });

  it("サイトタブを編集して保存するとセクション単位で保存される", async () => {
    const user = userEvent.setup();
    mocks.saveSiteSettingsSection.mockImplementation(
      async (_section: string, data: Record<string, unknown>) => ({ data })
    );
    renderTabs();

    const nameInput = screen.getByLabelText("サイト名");
    await user.clear(nameInput);
    await user.type(nameInput, "みらい議会＠さがみはら");
    expect(screen.getByText("未保存の変更があります")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mocks.saveSiteSettingsSection).toHaveBeenCalledTimes(1);
    });
    const [section, data] = mocks.saveSiteSettingsSection.mock.calls[0];
    expect(section).toBe("site");
    expect(data.name).toBe("みらい議会＠さがみはら");
    expect(data.published).toBe(false);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("議会タブで委員会を追加できる", async () => {
    const user = userEvent.setup();
    renderTabs({}, "council");

    const rowsBefore = screen.getAllByLabelText("名称");
    expect(rowsBefore).toHaveLength(settings.council.committees.length);

    await user.click(screen.getByRole("button", { name: "委員会を追加" }));
    expect(screen.getAllByLabelText("名称")).toHaveLength(
      settings.council.committees.length + 1
    );
  });

  it("タブを切り替えると表示が変わり、URL のクエリも置き換わる", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderTabs();
    await user.click(screen.getByRole("tab", { name: /リンク/ }));
    expect(
      await screen.findByLabelText("このサイトのソースコード（必須）")
    ).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/settings?tab=links");
  });

  it("未保存の変更があるときはタブ切替前に確認する", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTabs();

    await user.type(screen.getByLabelText("サイト名"), "！");
    await user.click(screen.getByRole("tab", { name: /リンク/ }));

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("サイト名")).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("変更履歴から差し戻せる", async () => {
    const user = userEvent.setup();
    mocks.restoreSiteSettingsHistory.mockResolvedValue({});
    renderTabs();

    await user.click(screen.getByRole("button", { name: /変更履歴/ }));
    await user.click(screen.getByRole("button", { name: "この版に戻す" }));
    await user.click(screen.getByRole("button", { name: "戻す" }));

    await waitFor(() => {
      expect(mocks.restoreSiteSettingsHistory).toHaveBeenCalledWith(1);
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
