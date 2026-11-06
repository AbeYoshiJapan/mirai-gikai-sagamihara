import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { toPublicSiteSettings } from "@mirai-gikai/shared/site-settings/public";
import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { buildPolicyLinks, buildPrimaryLinks } from "./footer.config";

const base = toPublicSiteSettings(DEFAULT_SITE_SETTINGS);

describe("footer.config", () => {
  it("会期の制度名があるときだけ「○○とは」ページへのリンクを出す", () => {
    expect(buildPrimaryLinks(base).map((link) => link.href)).not.toContain(
      routes.councilSystem()
    );

    const yearRound = {
      ...base,
      council: { ...base.council, session_system_label: "通年議会" },
    };
    const link = buildPrimaryLinks(yearRound).find(
      (l) => l.href === routes.councilSystem()
    );
    expect(link?.label).toBe("通年議会とは");
    expect(link?.external).toBeUndefined();
  });

  it("会議日程の機能が有効なときだけ、会議の予定（カレンダー）へのリンクを出す", () => {
    const enabled = {
      ...base,
      features: { ...base.features, schedule: true },
    };
    expect(buildPrimaryLinks(enabled).map((link) => link.href)).toContain(
      routes.schedule()
    );

    const disabled = {
      ...base,
      features: { ...base.features, schedule: false },
    };
    expect(buildPrimaryLinks(disabled).map((link) => link.href)).not.toContain(
      routes.schedule()
    );
  });

  it("policyLinks の先頭に掲載方針、続いて規約ページ・正式ルート案内・開発者向けページへの内部リンクが含まれる", () => {
    const hrefs = buildPolicyLinks(base).map((link) => link.href);

    expect(hrefs[0]).toBe(routes.editorialPolicy());
    expect(hrefs).toContain(routes.terms());
    expect(hrefs).toContain(routes.privacy());
    expect(hrefs).toContain(routes.petitionGuide());
    expect(hrefs).toContain(routes.developers());
  });

  it("question_form が有効なときだけ質問と回答ページを出す", () => {
    const enabled = {
      ...base,
      features: { ...base.features, question_form: true },
    };
    expect(buildPolicyLinks(enabled).map((link) => link.href)).toContain(
      routes.questions()
    );

    const disabled = {
      ...base,
      features: { ...base.features, question_form: false },
    };
    expect(buildPolicyLinks(disabled).map((link) => link.href)).not.toContain(
      routes.questions()
    );
  });

  it("open_data_api が無効なら開発者向けページを出さない", () => {
    const settings = {
      ...base,
      features: { ...base.features, open_data_api: false },
    };
    const hrefs = buildPolicyLinks(settings).map((link) => link.href);
    expect(hrefs).not.toContain(routes.developers());
  });

  it("ソースコード公開先はサイト設定に URL があるときだけ出す", () => {
    expect(
      buildPrimaryLinks(base).some((link) => link.label === "ソースコード")
    ).toBe(false);

    const settings = {
      ...base,
      links: { ...base.links, fork_repo: "https://github.com/x/y" },
    };
    const source = buildPrimaryLinks(settings).find(
      (link) => link.label === "ソースコード"
    );
    expect(source?.href).toBe("https://github.com/x/y");
    expect(source?.external).toBe(true);
  });

  it("内部リンクには external フラグが付かない", () => {
    const internalHrefs = new Set<string>([
      routes.home(),
      routes.schedule(),
      routes.editorialPolicy(),
      routes.terms(),
      routes.privacy(),
      routes.petitionGuide(),
      routes.questions(),
      routes.developers(),
    ]);

    for (const link of [
      ...buildPrimaryLinks(base),
      ...buildPolicyLinks(base),
    ]) {
      if (internalHrefs.has(link.href)) {
        expect(link.external).toBeUndefined();
      } else {
        expect(link.external).toBe(true);
      }
    }
  });
});
