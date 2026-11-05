import { DEFAULT_SITE_SETTINGS } from "../defaults";
import type { SiteSettings } from "../schema";

/**
 * 相模原市議会向けのプリセット。初期設定ウィザードで「相模原市議会」を選ぶと
 * この値がフォームに入る。URL は 2026-11-01 に確認したもの。
 * 運営者の連絡先・SNS・ソースコード公開先・会派などは運営者が入力する。
 */
/**
 * 「通年議会とは」ページの本文。相模原市議会は 1 年を 1 会期とする通年議会で、
 * その中の定例会議（年 4 回）を単位に運営している。管理画面（議会タブ）で書き換えられる。
 */
export const SAGAMIHARA_SESSION_SYSTEM_MD = `## 1年を1つの会期にする「通年議会」

{{council_name}}は、1年間を1つの会期とする「通年議会」を採用しています。

通年議会でない議会では、定例会を開くたびに首長（市長）が議会を招集します。通年議会では会期が年度を通して続いているため、会期の中で開く各{{session_label}}を議長が招集することができます。議会が自らの判断でフットワーク良く会議を開けるので、首長が専決処分（議会の議決を経ずに決めること）を多用するような事態を防ぐことにもつながります。

## 運営の単位は「{{session_label}}」

通年議会といっても、1年中ずっと本会議を開いているわけではありません。{{council_name}}では、会期の中に年4回の{{session_label}}を設け、議案の審議や採決は{{session_label}}の期間に行っています。{{session_label}}という1つの単位が、議会運営の基本になっています。

「通年議会」か「年4回の定例会」かの二者択一ではなく、通年の会期のしくみのもとで{{session_label}}のくくりを生かす、どちらの制度の良いところも取り入れた運営です。このサイトでも、「次の{{session_label}}の開会まで○日」「{{session_label}}の閉会まで○日」のように、{{session_label}}を単位として議会の動きを表示しています。

## 委員会の活動と通年化

平成18年（2006年）の地方自治法の改正により、委員会が議案を提出できるようになりました。{{council_name}}でも、「自殺対策条例」「いじめ防止条例」などの取組が委員会から生まれています。

通年議会の導入を議論していた当時、こうした委員会の活動を、定例会のたびに議決するのではなく、通年の会期の中で委員会自体の判断を尊重して活発にしていこう、という議論がありました。通年化によって、定例会の閉会中の活動についてそのつど議決する必要がなくなり、委員会は会期を通して活動できるようになりました。

## もっと詳しく

- 議案の審議の流れや会議の予定は、「会議の予定」ページと{{council_name}}の公式サイトでご確認ください。
- このページの説明は運営者（{{operator_name}}）が作成したものです。制度の正確な内容は{{council_name}}の会議規則・公式の案内をご確認ください。
`;

/**
 * トップの「このサイトについて」に出す、サイト名の由来。運営者が自分の言葉に書き換える前提のひな形。
 * 「みらい議会」を名乗る場合、フォークガイドラインの「みらい議会＠地域名」の形式であることを説明する。
 */
export const SAGAMIHARA_NAME_NOTE_MD = `サイト名「{{site_name}}」は、政党チームみらいが公開しているオープンソース「みらい議会」（AGPL-3.0）をもとに作っていることを示すため、本家のフォークガイドラインが定める「みらい議会＠地域名」の形にしました。本家「みらい議会」が国会の議案を扱うのに対し、このサイトは{{council_name}}の議案を扱います。チームみらいが運営しているものではなく、{{operator_title}}の{{operator_name}}が個人で運営しています。

「＠相模原市」には、{{council_name}}で何が話し合われているかを、{{municipality}}に暮らすみなさんに「自分のまちのこと」として届けたい、という思いを込めています。`;

export const SAGAMIHARA_PRESET: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  site: {
    ...DEFAULT_SITE_SETTINGS.site,
    name: "みらい議会＠相模原市",
    tagline: "相模原市議会の議論をわかりやすく",
    name_note_md: SAGAMIHARA_NAME_NOTE_MD,
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
    // 通年議会。会期は年度を通して続き、その中の定例会議（年 4 回）と臨時会議で審議する。
    session_model: "year_round",
    year_start_month: 4,
    year_start_day: 1,
    session_label: "定例会議",
    session_system_label: "通年議会",
    session_system_summary:
      "1年を1つの会期とし、その中で年4回の定例会議を議長が招集して審議します",
    session_system_md: SAGAMIHARA_SESSION_SYSTEM_MD,
    out_of_period_label: "会期中（定例会議の間）",
    countdown_open_label: "開会まで",
    countdown_close_label: "閉会まで",
    resident_label: "市民",
    scope_label: "市議会・市政",
    primary_source_label: "相模原市議会の議案書・会議録",
    stage_labels: {
      ...DEFAULT_SITE_SETTINGS.council.stage_labels,
    },
    result_labels: {
      ...DEFAULT_SITE_SETTINGS.council.result_labels,
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

/** 委員会の初期データ。初期設定ウィザードを終えたとき committees テーブルが空なら入れる */
export type PresetCommittee = {
  name: string;
  short_name: string;
  kind: "standing" | "special" | "steering" | "budget" | "settlement" | "other";
  sort_order: number;
};

export const SAGAMIHARA_COMMITTEES: PresetCommittee[] = [
  { name: "総務委員会", short_name: "総務", kind: "standing", sort_order: 1 },
  { name: "民生委員会", short_name: "民生", kind: "standing", sort_order: 2 },
  { name: "市民環境経済委員会", short_name: "市民環境経済", kind: "standing", sort_order: 3 },
  { name: "建設委員会", short_name: "建設", kind: "standing", sort_order: 4 },
  { name: "こども文教委員会", short_name: "こども文教", kind: "standing", sort_order: 5 },
  { name: "議会運営委員会", short_name: "議運", kind: "steering", sort_order: 6 },
  { name: "予算特別委員会", short_name: "予算特別", kind: "budget", sort_order: 7 },
  { name: "決算特別委員会", short_name: "決算特別", kind: "settlement", sort_order: 8 },
];

export type SiteSettingsPreset = {
  label: string;
  settings: SiteSettings;
  committees: PresetCommittee[];
};

export const SITE_SETTINGS_PRESETS = {
  sagamihara: {
    label: "相模原市議会",
    settings: SAGAMIHARA_PRESET,
    committees: SAGAMIHARA_COMMITTEES,
  },
} as const satisfies Record<string, SiteSettingsPreset>;

export type SiteSettingsPresetId = keyof typeof SITE_SETTINGS_PRESETS;
