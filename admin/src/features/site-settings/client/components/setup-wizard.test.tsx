// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { SAGAMIHARA_PRESET } from "@mirai-gikai/shared/site-settings/presets";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetupWizard } from "./setup-wizard";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  saveSiteSettingsSections: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("../../server/actions/save-site-settings-section", () => ({
  saveSiteSettingsSections: mocks.saveSiteSettingsSections,
}));

vi.mock("../../server/actions/upload-site-asset", () => ({
  uploadSiteAsset: vi.fn(),
}));

beforeEach(() => {
  mocks.push.mockReset();
  mocks.refresh.mockReset();
  mocks.saveSiteSettingsSections.mockReset();
  window.scrollTo = vi.fn();
});

describe("SetupWizard", () => {
  it("相模原のひな形を選ぶとサイト名と議会名が埋まる", async () => {
    const user = userEvent.setup();
    render(
      <SetupWizard current={DEFAULT_SITE_SETTINGS} isSetupCompleted={false} />
    );

    expect(
      screen.getByRole("heading", { name: "はじめに" })
    ).toBeInTheDocument();
    await user.click(screen.getByText("相模原市議会のひな形"));
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByRole("heading", { name: "サイトと議会" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("サイト名")).toHaveValue(
      SAGAMIHARA_PRESET.site.name
    );
    expect(screen.getByLabelText("議会名")).toHaveValue("相模原市議会");
  });

  it("入力に誤りがあると次へ進めない", async () => {
    const user = userEvent.setup();
    render(
      <SetupWizard current={DEFAULT_SITE_SETTINGS} isSetupCompleted={false} />
    );

    await user.click(screen.getByText("空から始める"));
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      await screen.findByRole("heading", { name: "サイトと議会" })
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("本番 URL"));
    await user.type(screen.getByLabelText("本番 URL"), "not-a-url");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByText("http(s):// から始まる URL を入力してください")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "サイトと議会" })
    ).toBeInTheDocument();
  });

  it("最後まで進むと全セクションをまとめて保存し、初期設定完了にする", async () => {
    const user = userEvent.setup();
    mocks.saveSiteSettingsSections.mockResolvedValue({});

    const current = {
      ...SAGAMIHARA_PRESET,
      links: {
        ...SAGAMIHARA_PRESET.links,
        fork_repo: "https://github.com/example/mirai-gikai-sagamihara",
      },
      operator: { ...SAGAMIHARA_PRESET.operator, name: "相模原 太郎" },
    };
    render(<SetupWizard current={current} isSetupCompleted={false} />);

    await user.click(screen.getByText("いまの設定から続ける"));
    for (const title of [
      "サイトと議会",
      "運営者",
      "見た目とリンク",
      "機能と公開",
    ]) {
      await user.click(screen.getByRole("button", { name: "次へ" }));
      expect(
        await screen.findByRole("heading", { name: title })
      ).toBeInTheDocument();
    }

    expect(screen.getByText("公開前の点検")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "保存して完了" }));

    await waitFor(() => {
      expect(mocks.saveSiteSettingsSections).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.saveSiteSettingsSections.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(
      Object.keys(DEFAULT_SITE_SETTINGS).sort()
    );
    expect(payload.site.setup_completed).toBe(true);
    expect(payload.site.name).toBe(SAGAMIHARA_PRESET.site.name);
    expect(payload.council.committees).toEqual(
      SAGAMIHARA_PRESET.council.committees
    );
    expect(mocks.push).toHaveBeenCalledWith("/settings");
  });

  it("サーバー側の検証エラーは項目に表示される", async () => {
    const user = userEvent.setup();
    mocks.saveSiteSettingsSections.mockResolvedValue({
      error: "入力内容に誤りがあります",
      fieldErrors: { "links.fork_repo": "公開先 URL が必要です" },
    });

    render(<SetupWizard current={SAGAMIHARA_PRESET} isSetupCompleted />);

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "次へ" }));
    }
    await user.click(screen.getByRole("button", { name: "保存して完了" }));

    await waitFor(() => {
      expect(mocks.saveSiteSettingsSections).toHaveBeenCalled();
    });
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(
      await screen.findByText("公開先 URL が必要です")
    ).toBeInTheDocument();
  });
});
