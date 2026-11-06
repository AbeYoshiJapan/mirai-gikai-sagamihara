import { normalizeText } from "./html-text";

/**
 * カレンダーの略称（「議運」「総務」「本会議予備日」など）を、会議の正式な名前と区分にする。
 *
 * 委員会は管理画面「委員会」に登録した名前・略称と突き合わせる（相模原市議会の初期データは
 * 「総務委員会／総務」など）。知らない略称は、そのままの名前・区分「その他」にして
 * `recognized: false` を返す。どちらも仮の値で、運営者が確認して直す。
 */

export type MeetingCategory =
  | "plenary"
  | "standing"
  | "special"
  | "steering"
  | "other";

export type CommitteeKind =
  | "standing"
  | "special"
  | "steering"
  | "budget"
  | "settlement"
  | "other";

export type CommitteeForMeeting = {
  id: string;
  name: string;
  short_name: string;
  kind: CommitteeKind;
};

export type ResolvedMeeting = {
  name: string;
  category: MeetingCategory;
  committeeId: string | null;
  /** 名前・区分を確かに決められたか（false なら管理画面で「名前を確認」を出す） */
  recognized: boolean;
};

/** 委員会ではない会議の略称 */
const FIXED_MEETINGS: Record<string, { name: string; category: MeetingCategory }> =
  {
    本会議: { name: "本会議", category: "plenary" },
    本会議予備日: { name: "本会議（予備日）", category: "plenary" },
    "本会議(予備日)": { name: "本会議（予備日）", category: "plenary" },
    議運: { name: "議会運営委員会", category: "steering" },
    議会運営委員会: { name: "議会運営委員会", category: "steering" },
    全協: { name: "全員協議会", category: "other" },
    全員協議会: { name: "全員協議会", category: "other" },
    代表者会議: { name: "代表者会議", category: "other" },
    各派代表者会議: { name: "各派代表者会議", category: "other" },
  };

const KIND_TO_CATEGORY: Record<CommitteeKind, MeetingCategory> = {
  standing: "standing",
  special: "special",
  steering: "steering",
  budget: "special",
  settlement: "special",
  other: "other",
};

function compact(text: string): string {
  return normalizeText(text).replace(/\s/g, "");
}

function findCommittee(
  label: string,
  committees: CommitteeForMeeting[]
): CommitteeForMeeting | undefined {
  return committees.find((c) => {
    const name = compact(c.name);
    const short = compact(c.short_name);
    return (
      label === name ||
      (short !== "" && label === short) ||
      `${label}委員会` === name ||
      label === name.replace(/委員会$/, "")
    );
  });
}

export function resolveMeetingLabel(
  rawLabel: string,
  committees: CommitteeForMeeting[],
  /** 詳細ページの見出し（会議名らしいときだけ渡す） */
  detailTitle?: string | null
): ResolvedMeeting {
  const label = compact(rawLabel);

  const fixed = FIXED_MEETINGS[label];
  if (fixed) {
    const committee =
      fixed.category === "steering" ? findCommittee(fixed.name, committees) : undefined;
    return { ...fixed, committeeId: committee?.id ?? null, recognized: true };
  }

  const committee = findCommittee(label, committees);
  if (committee) {
    return {
      name: committee.name,
      category: KIND_TO_CATEGORY[committee.kind],
      committeeId: committee.id,
      recognized: true,
    };
  }

  // 詳細ページの見出しが会議名なら、それを名前にする（略称より正確）
  const title = detailTitle ? compact(detailTitle) : "";
  const name = title || label;
  if (/特別委員会/.test(name)) {
    return { name, category: "special", committeeId: null, recognized: !!title };
  }
  if (/本会議/.test(name)) {
    return { name, category: "plenary", committeeId: null, recognized: !!title };
  }
  if (/(委員会|分科会)$/.test(name)) {
    return { name, category: "standing", committeeId: null, recognized: !!title };
  }
  return { name, category: "other", committeeId: null, recognized: false };
}
