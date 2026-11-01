import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { SAGAMIHARA_PRESET } from "@mirai-gikai/shared/site-settings/presets";
import { describe, expect, it } from "vitest";
import { applyPreset } from "./apply-preset";

describe("applyPreset", () => {
  it("既定値のままの設定にはプリセットがそのまま入る", () => {
    const result = applyPreset(DEFAULT_SITE_SETTINGS, SAGAMIHARA_PRESET);
    expect(result).toEqual(SAGAMIHARA_PRESET);
  });

  it("運営者が変えた項目は残り、既定値のままの項目だけ埋まる", () => {
    const current = {
      ...DEFAULT_SITE_SETTINGS,
      site: { ...DEFAULT_SITE_SETTINGS.site, name: "みらい議会＠さがみはら" },
      links: {
        ...DEFAULT_SITE_SETTINGS.links,
        fork_repo: "https://github.com/example/repo",
      },
    };
    const result = applyPreset(current, SAGAMIHARA_PRESET);

    expect(result.site.name).toBe("みらい議会＠さがみはら");
    expect(result.site.tagline).toBe(SAGAMIHARA_PRESET.site.tagline);
    expect(result.links.fork_repo).toBe("https://github.com/example/repo");
    expect(result.links.council_site).toBe(
      SAGAMIHARA_PRESET.links.council_site
    );
  });

  it("配列は丸ごと扱う（既定値のままならプリセットの取込元が入る）", () => {
    const result = applyPreset(DEFAULT_SITE_SETTINGS, SAGAMIHARA_PRESET);
    expect(result.import.sources).toEqual(SAGAMIHARA_PRESET.import.sources);

    const edited = {
      ...DEFAULT_SITE_SETTINGS,
      import: {
        ...DEFAULT_SITE_SETTINGS.import,
        sources: [
          {
            id: "custom",
            adapter: "custom_adapter",
            url: "https://example.org/bills",
            enabled: true,
            schedule: "",
          },
        ],
      },
    };
    expect(applyPreset(edited, SAGAMIHARA_PRESET).import.sources).toEqual(
      edited.import.sources
    );
  });

  it("入力を書き換えない", () => {
    const current = structuredClone(DEFAULT_SITE_SETTINGS);
    applyPreset(current, SAGAMIHARA_PRESET);
    expect(current).toEqual(DEFAULT_SITE_SETTINGS);
  });
});
