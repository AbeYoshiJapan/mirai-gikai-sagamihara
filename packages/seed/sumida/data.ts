import type { Database } from "@mirai-gikai/supabase";
import { planBills, planContents } from "./data-plans";
import { r7JuneBills, r7JuneContents } from "./data-r7-06";
import { r7SeptBills, r7SeptContents } from "./data-r7-09";
import { r7NovBills, r7NovContents } from "./data-r7-11";
import { r7FebBills, r7FebContents } from "./data-r7-02";
import { r6JuneBills, r6JuneContents } from "./data-r6-06";
import { r6SeptBills, r6SeptContents } from "./data-r6-09";
import { r6NovBills, r6NovContents } from "./data-r6-11";
import { r6FebBills, r6FebContents } from "./data-r6-02";
import { r5JuneBills, r5JuneContents } from "./data-r5-06";
import { r5SeptBills, r5SeptContents } from "./data-r5-09";
import { r5NovBills, r5NovContents } from "./data-r5-11";
import { r5FebBills, r5FebContents } from "./data-r5-02";
import { pastReportBills, pastReportContents } from "./houkoku-all";
import { tokubetsuBills, tokubetsuContents } from "./data-r8-tokubetsu";
import { houkokuBills, houkokuContents } from "./data-r8-06-houkoku";
import { restBills, restContents } from "./data-r8-06-rest";

type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type DietSessionInsert =
  Database["public"]["Tables"]["diet_sessions"]["Insert"];

/*
 * 墨田区版（試作）の投入データ。
 * 出典はすべて墨田区議会 会議録検索システムの会議録（令和8年6月議会）。
 * - 提案理由：本会議 令和8年6月17日（第3号）副区長説明
 * - 委員会審査：企画総務 6/25、地域産業都市 6/23、子ども文教 6/22
 * - 議決：本会議 令和8年6月30日（第4号）委員会審査報告どおり決定（異議なし）
 *
 * 一院制のため originating_house は常に HR とし、表示側で
 * HR=委員会・HC=本会議 と読み替えている。
 */

const KAIGIROKU_URL = "https://ssp.kaigiroku.net/tenant/sumida/SpTop.html";

/**
 * 会期は議会年度（5月1日〜翌年4月30日）ごとに1つ。墨田区議会は通年議会なので、
 * 定例会は年1回で会期は通年（墨田区議会基本条例第7条、通年議会実施要綱第2条）。
 * 6月・9月・11月・2月議会は会期の中の「議会期間」で、会議日程（council_meetings）から求める。
 * 議案は提出日（委員会報告などは報告日）で、どの年度に入るかを決める。
 */
const councilYearSession = (reiwa: number): DietSessionInsert => {
  const year = 2018 + reiwa;
  return {
    name: `令和${reiwa}年度定例会`,
    slug: `r${reiwa}`,
    shugiin_url: KAIGIROKU_URL,
    start_date: `${year}-05-01`,
    end_date: `${year + 1}-04-30`,
    is_active: reiwa === 8,
  };
};

// 今の任期（2023年5月〜）の議会年度
export const sessions: DietSessionInsert[] = [5, 6, 7, 8].map(
  councilYearSession
);

export const tags: TagInsert[] = [
  {
    label: "子育て・教育",
    description: "学校・保育・子育て支援に関する議案",
    featured_priority: 1,
  },
  {
    label: "まちづくり",
    description: "都市計画・建築・公園に関する議案",
    featured_priority: 2,
  },
  {
    label: "区政運営",
    description: "区の組織・附属機関・事務に関する議案",
    featured_priority: 3,
  },
  {
    label: "予算・契約",
    description: "補正予算・工事契約・物品の買入れに関する議案",
    featured_priority: 4,
  },
  {
    label: "健康・福祉",
    description: "国民健康保険・医療・福祉に関する議案",
    featured_priority: 5,
  },
  {
    label: "意見書・推薦",
    description: "議員が提出した意見書・推薦などの議案",
    featured_priority: 6,
  },
  {
    label: "文化・産業",
    description: "文化芸術・観光・商店街・産業に関する議案と報告",
    featured_priority: 7,
  },
  {
    label: "防災・安全",
    description: "防災・危機管理・国民保護に関する議案と報告",
    featured_priority: 8,
  },
];

const passed = {
  originating_house: "HR",
  status: "enacted",
  status_note: "令和8年6月30日 本会議で可決（異議なし）",
  submitted_date: "2026-06-12T10:00:00+09:00",
  publish_status: "published",
  published_at: "2026-10-21T09:00:00+09:00",
  shugiin_url: KAIGIROKU_URL,
} as const;

export const bills: (BillInsert & { tag: string })[] = [
  {
    ...passed,
    name: "議案第6号 墨田区立学校施設使用条例の一部を改正する条例",
    is_featured: true,
    tag: "子育て・教育",
  },
  {
    ...passed,
    name: "議案第5号 墨田区地区計画の区域内における建築物の制限に関する条例の一部を改正する条例",
    tag: "まちづくり",
  },
  {
    ...passed,
    name: "議案第4号 墨田区附属機関の設置に関する条例の一部を改正する条例",
    tag: "区政運営",
  },
  ...restBills,
  ...houkokuBills,
  ...planBills,
  ...tokubetsuBills,
  ...r7JuneBills,
  ...r7SeptBills,
  ...r7NovBills,
  ...r7FebBills,
  ...r6JuneBills,
  ...r6SeptBills,
  ...r6NovBills,
  ...r6FebBills,
  ...r5JuneBills,
  ...r5SeptBills,
  ...r5NovBills,
  ...r5FebBills,
  ...pastReportBills,
];

type Content = {
  bill_name: string;
  difficulty_level: "normal" | "hard";
  title: string;
  summary: string;
  content: string;
};

const SOURCE_NOTE = `---

**出典**：墨田区議会 会議録（令和8年度定例会6月議会）。本会議 6月17日・6月30日、所管委員会の記録。
この解説は会議録をもとにAIで整理したものです。正確な内容は会議録・条例の原文をご確認ください。`;

export const contents: Content[] = [
  // ===== 議案第6号 =====
  {
    bill_name: bills[0].name,
    difficulty_level: "normal",
    title: "学校の体育館などを1時間単位で借りられるようにする",
    summary:
      "区立学校の体育館などを地域の団体に貸すしくみを、時間帯ごとの「区分貸し」から「1時間単位の時間貸し」に変えます。令和9年2月1日から始まります。",
    content: `# 学校の体育館などを1時間単位で借りられるようにする

## なにが変わるの？

学校が使っていない時間の体育館などは、地域のスポーツ団体や町会などに貸し出されています。

- **いま**：決まった時間帯（区分）ごとに借りる
- **これから**：**1時間単位**で借りられる

使用料の上限額は、今の金額を1時間あたりに直した額と同じにする、と区は説明しています。

## いつから？

**令和9年2月1日**から。申し込みなどの準備は、それより前から始められます。

## あわせて予定されていること

区は、条例が変わった後に**インターネットの予約システム**を入れる予定だと説明しています。

- いま：空き確認・キャンセルは学校へ来校か電話、申請は書類を学校へ提出
- 予定：空き確認・申請・キャンセルがネットででき、支払いもオンライン決済に

## 委員会で出た主な質問

- **少年団体などの減免は続く？** → これまでの考え方を基本的に引き継ぐ、との答弁
- **ネットが苦手な方への対応は？** → 区役所の窓口や電話での対応を考えている、との答弁
- **費用は？** → 東京都の共同調達を使い、初期費用 約230万円・運用費 約50万円程度の予定、との答弁

## 結果

子ども文教委員会（6月22日）で異議なく可決すべきものと決定し、6月30日の本会議で可決されました。

${SOURCE_NOTE}`,
  },
  {
    bill_name: bills[0].name,
    difficulty_level: "hard",
    title: "墨田区立学校施設使用条例の一部改正（区分貸しから時間貸しへ）",
    summary:
      "学校施設の貸出しを時間区分による区分貸しから1時間単位の時間貸しに改め、使用料の上限額と使用時間の区分を改正する。施行は令和9年2月1日。",
    content: `# 墨田区立学校施設使用条例の一部改正

## 提案理由（6月17日 本会議・副区長説明）

区民の利便性の向上と効率的な学校施設の貸出しのため、時間区分で使用する区分貸しから1時間単位での時間貸しに変更し、使用料の上限額及び使用時間の区分を改正する。

## 改正の要点（6月22日 子ども文教委員会・理事者説明）

- 改正後の使用料上限額は、現行額を1時間当たりに換算した額と同額
- 施行日：令和9年2月1日（必要な手続・使用料の徴収その他の準備行為は施行日前でも可）
- 改正後に学校施設開放予約システムを導入予定（空き確認・申請・キャンセルをオンライン化、オンライン決済）

## 委員会での主な質疑

| 論点 | 答弁の要旨 |
|---|---|
| 少年団体等の減免 | これまでの減免の考え方を基本的に踏襲 |
| デジタルデバイド対策 | 区役所窓口・電話での対応を想定。必要に応じ幅広く検討 |
| 決済手段 | コード決済、クレジットカード、コンビニ決済、ペイジー等を想定（詳細は検討中） |
| 施行規則 | 条例改正に伴う大きな改正は想定せず。システム導入時に電子申請の規定は改正が必要 |
| システム費用 | 既存の公共施設予約システムへの組込みは見積りで数千万円規模。都の共同調達でイニシャル約230万円・ランニング約50万円程度を予定 |
| 既存団体の登録番号 | システムの特性上引継ぎは難しく再手続が必要。最近登録した団体は手続の省略を検討 |
| 在り方検討会の論点 | 既存団体と新規団体の双方が活動できるよう、抽選機能を備えたシステムが望ましいとの方向 |

## 審査結果

- 6月22日 子ども文教委員会：原案どおり可決すべきものと異議なく決定
- 6月30日 本会議：委員会審査報告どおり決定（異議なし）

${SOURCE_NOTE}`,
  },

  // ===== 議案第5号 =====
  {
    bill_name: bills[1].name,
    difficulty_level: "normal",
    title: "東武曳舟駅前の地区計画に合わせて建物のルールを決める",
    summary:
      "東武曳舟駅の周辺で決まった「地区計画」の内容のうち、建物の用途などの制限を、建築基準法にもとづいて区の条例に書き込みます。",
    content: `# 東武曳舟駅前の地区計画に合わせて建物のルールを決める

## なにが変わるの？

東武曳舟駅の周辺では、まちづくりの方針にそって **「東武曳舟駅前地区地区計画」** が令和8年3月25日に決まりました。

地区計画は「この地区ではこんな建物にしましょう」というまちのルールです。そのうち、

- 建物の**用途**の制限（性風俗に関わるお店などに使う建物は建てられない）
- **敷地の広さ**の最低限度（500㎡。交番や公衆便所、公園施設などの敷地は除く）
- 建物の**壁面の位置**の制限（曳舟たから通り沿い）

を、守らなければならないルールとして**区の条例**に書き込みます。

## いつから？

条例を公布した日から。

## 委員会で出た主な質問

- **地区内にできる公園は区立公園になる？** → 都市計画公園に位置付けられており、区立公園として整備・管理していく方向、との答弁

## 結果

地域産業都市委員会（6月23日）で異議なく可決すべきものと決定し、6月30日の本会議で可決されました。

${SOURCE_NOTE}`,
  },
  {
    bill_name: bills[1].name,
    difficulty_level: "hard",
    title:
      "墨田区地区計画の区域内における建築物の制限に関する条例の一部改正（東武曳舟駅前地区）",
    summary:
      "令和8年3月25日に都市計画決定した東京都市計画東武曳舟駅前地区地区計画の地区整備計画区域を条例の適用区域に追加し、建築物の制限を定める。",
    content: `# 地区計画区域内の建築物の制限に関する条例の一部改正

## 提案理由（6月17日 本会議・副区長説明）

東武曳舟駅周辺地区まちづくり方針に掲げるまちづくりの実現に向け、本年3月25日に告示した東京都市計画東武曳舟駅前地区地区計画のうち、建築物の用途に関する制限等を、建築基準法の規定に基づき条例で定める。

## 改正の内容（6月23日 地域産業都市委員会・理事者説明）

- 適用区域に東京都市計画東武曳舟駅前地区 地区整備計画区域を追加
- 建築してはならない建築物：風俗営業等の規制及び業務の適正化等に関する法律第2条第6項各号、第7項各号及び第8項から第10項までのいずれかに該当する営業（店舗型性風俗特殊営業など）の用途に供するもの
- 建築物の敷地面積の最低限度：500平方メートル（公衆便所・巡査派出所など公益上必要な建築物の敷地、歩行者の回遊性・利便性の向上とにぎわいのある複合市街地の形成のために設ける公園施設等の敷地は除く）
- 建築物の壁面の位置の制限：地区計画の計画図3に示す位置（曳舟たから通り沿い）。落下物を防ぐひさし・バルコニー等、転落防止の鉄柵等は除く
- （出典：6月23日 地域産業都市委員会 配付の条例案概要）
- 施行日：公布の日

## 委員会での主な質疑

| 論点 | 答弁の要旨 |
|---|---|
| 地区内の都市計画公園 | 令和8年3月25日の都市計画決定で都市計画公園に位置付け。区立公園として整備・管理する方向 |

## 審査結果

- 6月23日 地域産業都市委員会：原案どおり可決すべきものと異議なく決定
- 6月30日 本会議：委員会審査報告どおり決定（異議なし）

${SOURCE_NOTE}`,
  },

  // ===== 議案第4号 =====
  {
    bill_name: bills[2].name,
    difficulty_level: "normal",
    title: "都市計画マスタープランを見直すための専門家の委員会をつくる",
    summary:
      "区のまちづくりの基本方針「都市計画マスタープラン」を改定するため、専門的な立場から調べて検討する委員会を、区長の附属機関として新しく置きます。",
    content: `# 都市計画マスタープランを見直すための専門家の委員会をつくる

## なにが変わるの？

「都市計画マスタープラン」は、区のまちづくりの基本的な方針です。区はこれを改定するため、

**「墨田区都市計画マスタープラン改定検討委員会」**

を、区長の**附属機関**（区長の相談を受けて調べたり意見を出したりする機関）として新しく置くため、「墨田区附属機関の設置に関する条例」を改正します。

## いつから？

条例を公布した日から。

## 委員会で出た主な質問

- **すでに都市計画審議会があるのに、なぜ別の委員会を置くの？** → 都市計画審議会は都市計画に関する事項を広く諮問する機関。マスタープランをよりよいものにするため、別に検討委員会を置く、との答弁

## 結果

企画総務委員会（6月25日）で異議なく可決すべきものと決定し、6月30日の本会議で可決されました。

${SOURCE_NOTE}`,
  },
  {
    bill_name: bills[2].name,
    difficulty_level: "hard",
    title: "墨田区附属機関の設置に関する条例の一部改正（都市計画マスタープラン改定検討委員会の設置）",
    summary:
      "墨田区都市計画マスタープランの改定に向け、専門的な視点から調査・検討を行う墨田区都市計画マスタープラン改定検討委員会を区長の附属機関として設置する。",
    content: `# 墨田区附属機関の設置に関する条例の一部改正

## 提案理由（6月17日 本会議・副区長説明）

墨田区都市計画マスタープランの改定を行うため、専門的な視点から調査及び検討を行う墨田区都市計画マスタープラン改定検討委員会を、区長の附属機関として設置する。施行日は公布の日。

## 委員会での主な質疑（6月25日 企画総務委員会）

| 論点 | 答弁の要旨 |
|---|---|
| 都市計画審議会がある中で別に附属機関を置く理由 | 都市計画審議会は都市計画に関する事項を広く諮問する機関。都市計画マスタープラン（都市計画法第18条の2）をよりよいものにするため、別途検討委員会を附属機関として設置する |

## 審査結果

- 6月25日 企画総務委員会：原案どおり可決すべきものと異議なく決定
- 6月30日 本会議：委員会審査報告どおり決定（異議なし）

${SOURCE_NOTE}`,
  },
  ...restContents,
  ...houkokuContents,
  ...planContents,
  ...tokubetsuContents,
  ...r7JuneContents,
  ...r7SeptContents,
  ...r7NovContents,
  ...r7FebContents,
  ...r6JuneContents,
  ...r6SeptContents,
  ...r6NovContents,
  ...r6FebContents,
  ...r5JuneContents,
  ...r5SeptContents,
  ...r5NovContents,
  ...r5FebContents,
  ...pastReportContents,
];
