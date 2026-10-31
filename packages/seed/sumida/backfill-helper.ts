import type { Database } from "@mirai-gikai/supabase";

type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];

/*
 * 過去の議会期間の議案を、決まった形の解説（やさしい・詳しい）にするための部品。
 * 議会期間ごとのデータファイル（data-r6-06.ts など）から使う。
 * 委員会の質疑は、発言した委員の名前・会派を書かず「〜との答弁」の形にそろえる。
 */

const KAIGIROKU_URL = "https://ssp.kaigiroku.net/tenant/sumida/SpTop.html";

export type Tagged = BillInsert & { tag: string };
export type Content = {
  bill_name: string;
  difficulty_level: "normal" | "hard";
  title: string;
  summary: string;
  content: string;
};

export type BillSpec = {
  /** 議案の正式名（年度をまたいで重なるものは末尾に年度を付ける） */
  name: string;
  tag: string;
  /** 提出日 YYYY-MM-DD */
  submitted: string;
  /** 一覧に出す結果の一行（例：令和6年6月28日 本会議で可決（異議なし）） */
  note: string;
  featured?: boolean;
  /** 否決など、可決以外のとき */
  status?: "enacted" | "rejected";
  title: string;
  summary: string;
  /** やさしい版の本文（見出しの下） */
  normal: string;
  hardTitle?: string;
  hardSummary: string;
  /** 詳しい版の本文（提案理由など） */
  hard: string;
  qa?: [string, string][];
  /** やさしい版の結果（委員会・本会議） */
  results: string[];
  /** 詳しい版の結果。省略時は results を使う */
  hardResults?: string[];
};

export function createBackfill(sourceLabel: string) {
  const bills: Tagged[] = [];
  const contents: Content[] = [];
  const sourceNote = `---

**出典**：墨田区議会 会議録（${sourceLabel}）。
この解説は会議録をもとにAIで整理したものです。正確な内容は会議録・議案の原文をご確認ください。`;

  function add(s: BillSpec) {
    bills.push({
      originating_house: "HR",
      status: s.status ?? "enacted",
      status_note: s.note,
      submitted_date: `${s.submitted}T10:00:00+09:00`,
      publish_status: "published",
      published_at: "2026-10-22T09:00:00+09:00",
      shugiin_url: KAIGIROKU_URL,
      name: s.name,
      tag: s.tag,
      ...(s.featured ? { is_featured: true } : {}),
    });
    const qaN = s.qa?.length
      ? `\n## 委員会で出た主な質問\n\n${s.qa.map(([q, a]) => `- **${q}** → ${a}、との答弁`).join("\n")}\n`
      : "";
    const qaH = s.qa?.length
      ? `\n## 委員会での主な質疑\n\n| 論点 | 答弁の要旨 |\n|---|---|\n${s.qa.map(([q, a]) => `| ${q.replace(/[？?]$/, "")} | ${a} |`).join("\n")}\n`
      : "";
    const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
    const hardTitle = s.hardTitle ?? s.name.replace(/^(議案|議員提出議案|報告)第\d+号 /, "").replace(/（令和\d+年度[^）]*）$/, "");
    contents.push(
      {
        bill_name: s.name,
        difficulty_level: "normal",
        title: s.title,
        summary: s.summary,
        content: `# ${s.title}

${s.normal}
${qaN}
## 結果

${list(s.results)}

${sourceNote}`,
      },
      {
        bill_name: s.name,
        difficulty_level: "hard",
        title: hardTitle,
        summary: s.hardSummary,
        content: `# ${hardTitle}

${s.hard}
${qaH}
## 審査結果

${list(s.hardResults ?? s.results)}

${sourceNote}`,
      }
    );
  }

  /**
   * 委員会報告・特別委員会の開催回（採決なし）。
   * 名前は「【委員会報告】題名（令和○年○月）」のように年月を付けて重ならないようにする。
   */
  function addReport(r: ReportSpec) {
    const kind = r.kind ?? "reported";
    bills.push({
      originating_house: "HR",
      status: kind,
      status_note: r.note,
      submitted_date: `${r.date}T10:00:00+09:00`,
      publish_status: "published",
      published_at: "2026-10-22T09:00:00+09:00",
      shugiin_url: KAIGIROKU_URL,
      name: r.name,
      tag: r.tag,
      ...(r.featured ? { is_featured: true } : {}),
    });
    const qaN = r.qa?.length
      ? `\n## 委員会で出た主な質問\n\n${r.qa.map(([q, a]) => `- **${q}** → ${a}、との答弁`).join("\n")}\n`
      : "";
    const qaH = r.qa?.length
      ? `\n## 委員会での主な質疑\n\n| 論点 | 答弁の要旨 |\n|---|---|\n${r.qa.map(([q, a]) => `| ${q.replace(/[？?]$/, "")} | ${a} |`).join("\n")}\n`
      : "";
    const where = `\n## 報告の場\n\n- ${r.note}（${kind === "special_committee" ? "調査のための委員会で、採決はありません" : "区からの報告で、採決はありません"}）\n`;
    const hardTitle =
      r.hardTitle ?? r.name.replace(/^【[^】]+】/, "").replace(/（令和\d+年\d+月[^）]*）$/, "");
    contents.push(
      {
        bill_name: r.name,
        difficulty_level: "normal",
        title: r.title,
        summary: r.summary,
        content: `# ${r.title}\n\n${r.normal}\n${qaN}${where}\n${sourceNote}`,
      },
      {
        bill_name: r.name,
        difficulty_level: "hard",
        title: hardTitle,
        summary: r.hardSummary ?? r.summary,
        content: `# ${hardTitle}\n\n${r.hard}\n${qaH}${where}\n${sourceNote}`,
      }
    );
  }

  return { bills, contents, add, addReport };
}

export type ReportSpec = {
  /** 「【委員会報告】題名（令和7年6月）」の形 */
  name: string;
  tag: string;
  /** 報告日 YYYY-MM-DD（年度の振り分けに使う） */
  date: string;
  /** 例：令和7年6月24日 子ども文教委員会で報告 */
  note: string;
  kind?: "reported" | "special_committee";
  featured?: boolean;
  title: string;
  summary: string;
  normal: string;
  hardTitle?: string;
  hardSummary?: string;
  hard: string;
  qa?: [string, string][];
};
