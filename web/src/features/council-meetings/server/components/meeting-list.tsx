import { FileText } from "lucide-react";
import type { CouncilMeeting } from "../../shared/types";
import {
  CATEGORY_LABELS,
  formatMeetingDateRange,
} from "../../shared/utils/council-period";

const CATEGORY_STYLES: Record<CouncilMeeting["category"], string> = {
  plenary: "bg-primary text-white",
  standing: "bg-mirai-gradient text-mirai-text",
  special: "bg-mirai-info-blue text-mirai-text",
  steering: "bg-mirai-surface-muted text-mirai-text-secondary",
  other: "bg-mirai-surface-muted text-mirai-text-secondary",
};

/**
 * 会議を日付ごとにまとめて並べる。同じ日の会議は議会サイトの並び順のまま。
 * `withAnchors` を付けると、日ごとに `#d-YYYY-MM-DD` で飛べるようにする（カレンダーから使う）。
 */
export function MeetingList({
  meetings,
  withAnchors = false,
}: {
  meetings: CouncilMeeting[];
  withAnchors?: boolean;
}) {
  const days: {
    key: string;
    date: string;
    label: string;
    items: CouncilMeeting[];
  }[] = [];
  for (const m of meetings) {
    const key = `${m.meeting_date}_${m.end_date ?? ""}`;
    const last = days.at(-1);
    if (last?.key === key) {
      last.items.push(m);
    } else {
      days.push({
        key,
        date: m.meeting_date,
        label: formatMeetingDateRange(m.meeting_date, m.end_date),
        items: [m],
      });
    }
  }
  const anchored = new Set<string>();

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        // 同じ日に始まる複数日の会議があっても、id は最初の 1 つにだけ付ける
        const id =
          withAnchors && !anchored.has(day.date) ? `d-${day.date}` : undefined;
        if (id) anchored.add(day.date);
        return (
          <div
            key={day.key}
            id={id}
            className="flex scroll-mt-24 flex-col gap-3 rounded-2xl bg-white px-5 py-4 md:flex-row md:gap-6"
          >
            <div className="shrink-0 text-[15px] font-bold text-mirai-brand-teal-deep md:w-44">
              {day.label}
            </div>
            <ul className="flex flex-1 flex-col gap-3">
              {day.items.map((m) => (
                <MeetingItem key={m.id} meeting={m} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MeetingItem({ meeting: m }: { meeting: CouncilMeeting }) {
  const details = [
    m.start_time,
    m.place,
    m.gallery && `傍聴席 ${m.gallery}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY_STYLES[m.category]}`}
        >
          {CATEGORY_LABELS[m.category]}
        </span>
        <span className="text-[15px] font-bold leading-6">{m.name}</span>
      </div>
      {details.length > 0 && (
        <span className="text-xs font-bold text-mirai-text-secondary">
          {details.join("・")}
        </span>
      )}
      {m.topic && (
        <span className="text-xs leading-5 text-mirai-text-secondary">
          {m.topic}
        </span>
      )}
      {(m.document_url ||
        m.agenda_pdf_url ||
        m.stream_url ||
        m.minutes_url ||
        m.result_pdf_url) && (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { href: m.document_url, label: "資料（PDF・議会サイト）" },
            { href: m.agenda_pdf_url, label: "議事日程" },
            { href: m.stream_url, label: "中継・録画" },
            { href: m.minutes_url, label: "会議録" },
            { href: m.result_pdf_url, label: "審議結果" },
          ]
            .filter((link): link is { href: string; label: string } =>
              Boolean(link.href)
            )
            .map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs font-bold text-primary underline underline-offset-2"
              >
                <FileText className="size-3.5" />
                {link.label}
              </a>
            ))}
        </span>
      )}
    </li>
  );
}
