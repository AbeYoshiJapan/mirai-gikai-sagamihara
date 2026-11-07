import {
  decodeEntities,
  stripTags,
} from "@mirai-gikai/shared/council-meetings/html-text";
import type { NoticeLinks } from "../types";
import { meetingKeyOf, meetingNameOf, parseMeetingLabel } from "./notice-text";

/**
 * 議会サイトの「提出議案・発言通告」ページから、通告一覧の PDF を見つける。
 * リンクの文字（例:「令和８年定例会９月定例会議　一般質問通告一覧[PDF：434KB]」）で見分け、
 * 定例会議ごとにまとめる。新しい定例会議が先。
 */

const LINK_RE = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

type LinkKind = "representative" | "general" | "order";

function linkKindOf(text: string): LinkKind | null {
  if (text.includes("一般質問順位")) return "order";
  if (text.includes("通告一覧") && /代表質問|個人質疑/.test(text)) {
    return "representative";
  }
  if (text.includes("一般質問通告一覧")) return "general";
  return null;
}

export function findNoticeLinks(html: string, baseUrl: string): NoticeLinks[] {
  const byMeeting = new Map<string, NoticeLinks>();
  for (const match of html.matchAll(LINK_RE)) {
    const text = stripTags(match[3]);
    const kind = linkKindOf(text);
    if (!kind) continue;
    let url: string;
    try {
      url = new URL(decodeEntities(match[2]).trim(), baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:\/\//.test(url)) continue;
    const meeting = parseMeetingLabel(text);
    const key = meeting ? meetingKeyOf(meeting.year, meeting.month) : "";
    const entry = byMeeting.get(key) ?? {
      meetingKey: meeting ? key : null,
      meetingName: meeting ? meetingNameOf(meeting.year, meeting.month) : null,
      representativeUrl: null,
      generalUrl: null,
      orderUrl: null,
    };
    if (kind === "representative") entry.representativeUrl ??= url;
    if (kind === "general") entry.generalUrl ??= url;
    if (kind === "order") entry.orderUrl ??= url;
    byMeeting.set(key, entry);
  }
  return [...byMeeting.values()].sort((a, b) =>
    (b.meetingKey ?? "").localeCompare(a.meetingKey ?? "")
  );
}
