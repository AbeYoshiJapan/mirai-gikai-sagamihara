import { describe, expect, it } from "vitest";
import { resolveNoticePageUrl } from "./notice-source";

describe("resolveNoticePageUrl", () => {
  const agenda = {
    adapter: "sagamihara_agenda_pdf",
    url: "https://www.sagamihara-shigikai.jp/doc/2013120900011/",
    enabled: true,
  };

  it("議案のページがあればそれを使い、無ければ議案の取込元を使う", () => {
    expect(
      resolveNoticePageUrl({
        billsPage: "https://example.jp/bills/",
        importSources: [agenda],
      })
    ).toBe("https://example.jp/bills/");
    expect(
      resolveNoticePageUrl({ billsPage: "", importSources: [agenda] })
    ).toBe(agenda.url);
  });

  it("どちらも無ければ null", () => {
    expect(
      resolveNoticePageUrl({
        billsPage: "",
        importSources: [{ ...agenda, enabled: false }],
      })
    ).toBeNull();
  });
});
