import { DEFAULT_SITE_SETTINGS } from "../defaults";
import type { SiteSettings } from "../schema";

/**
 * 相模原市議会向けのプリセット。初期設定ウィザードで「相模原市議会」を選ぶと
 * この値がフォームに入る。URL は 2026-11-01 に確認したもの。
 * 運営者の連絡先・SNS・ソースコード公開先・会派などは運営者が入力する。
 */
export const SAGAMIHARA_PRESET: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  site: {
    ...DEFAULT_SITE_SETTINGS.site,
    name: "みらい議会＠相模原市",
    tagline: "相模原市議会の議論をわかりやすく",
    description:
      "相模原市議会で今どんな議案が審議されているか、わかりやすく伝えるサイト。",
  },
  operator: {
    ...DEFAULT_SITE_SETTINGS.operator,
    title: "相模原市議会議員",
  },
  links: {
    ...DEFAULT_SITE_SETTINGS.links,
    council_site: "https://www.sagamihara-shigikai.jp/",
    minutes_search:
      "https://ssp.kaigiroku.net/tenant/sagamihara/SpMinuteSearch.html",
    live_stream: "https://www.sagamihara-shigikai.jp/doc/2017051800044/",
    bills_page: "https://www.sagamihara-shigikai.jp/doc/2013120900011/",
    results_page: "https://www.sagamihara-shigikai.jp/doc/2013120900035/",
    committee_results_page:
      "https://www.sagamihara-shigikai.jp/doc/2015120300013/",
    schedule_page: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
    newsletter: "https://sagamihara.mykoho.jp/",
    petition_guide: "https://www.sagamihara-shigikai.jp/doc/2013120600324/",
  },
  council: {
    ...DEFAULT_SITE_SETTINGS.council,
    name: "相模原市議会",
    municipality: "相模原市",
    kind: "city",
    // 通年議会。定例会は 4 月下旬の開会会議で始まり、3・6・9・12 月の定例会議と臨時会議で審議する。
    session_model: "year_round",
    year_start_month: 4,
    year_start_day: 1,
    session_label: "定例会議",
    resident_label: "市民",
    scope_label: "市議会・市政",
    primary_source_label: "相模原市議会の議案書・会議録",
    committees: [
      { name: "総務委員会", short_name: "総務", kind: "standing", sort: 1, is_active: true },
      { name: "民生委員会", short_name: "民生", kind: "standing", sort: 2, is_active: true },
      { name: "市民環境経済委員会", short_name: "市民環境経済", kind: "standing", sort: 3, is_active: true },
      { name: "建設委員会", short_name: "建設", kind: "standing", sort: 4, is_active: true },
      { name: "こども文教委員会", short_name: "こども文教", kind: "standing", sort: 5, is_active: true },
      { name: "議会運営委員会", short_name: "議運", kind: "steering", sort: 6, is_active: true },
      { name: "予算特別委員会", short_name: "予算特別", kind: "budget", sort: 7, is_active: true },
      { name: "決算特別委員会", short_name: "決算特別", kind: "settlement", sort: 8, is_active: true },
    ],
    status_labels: {
      preparing: "議案提出前",
      introduced: "提出",
      in_originating_house: "委員会審査中",
      in_receiving_house: "本会議採決待ち",
      enacted: "可決",
      rejected: "否決",
      reported: "委員会報告",
      plan: "行政計画",
      special_committee: "特別委員会",
    },
    in_progress_label: "市議会審議中",
  },
  import: {
    ...DEFAULT_SITE_SETTINGS.import,
    minutes_tenant: "sagamihara",
    sources: [
      {
        id: "agenda",
        adapter: "sagamihara_agenda_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2013120900011/",
        enabled: true,
        schedule: "",
      },
      {
        id: "results",
        adapter: "sagamihara_results_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2013120900035/",
        enabled: true,
        schedule: "",
      },
      {
        id: "committee_results",
        adapter: "sagamihara_committee_results",
        url: "https://www.sagamihara-shigikai.jp/doc/2015120300013/",
        enabled: true,
        schedule: "",
      },
      {
        id: "schedule",
        adapter: "sagamihara_schedule_pdf",
        url: "https://www.sagamihara-shigikai.jp/doc/2021051800010/",
        enabled: true,
        schedule: "",
      },
    ],
  },
  legal: {
    ...DEFAULT_SITE_SETTINGS.legal,
    modified_on: "2026-11-01",
  },
};

export const SITE_SETTINGS_PRESETS = {
  sagamihara: { label: "相模原市議会", settings: SAGAMIHARA_PRESET },
} as const;

export type SiteSettingsPresetId = keyof typeof SITE_SETTINGS_PRESETS;
