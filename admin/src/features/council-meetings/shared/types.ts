import type { MeetingCategory } from "@mirai-gikai/shared/council-meetings/resolve-meeting-label";
import { z } from "zod";

export type { MeetingCategory };

export const MEETING_CATEGORY_LABELS: Record<MeetingCategory, string> = {
  plenary: "本会議",
  standing: "常任委員会",
  special: "特別委員会",
  steering: "議会運営委員会",
  other: "その他",
};

/** 管理画面の一覧・編集で使う会議予定 */
export type AdminCouncilMeeting = {
  id: string;
  meeting_date: string;
  end_date: string | null;
  name: string;
  category: MeetingCategory;
  start_time: string | null;
  place: string | null;
  topic: string | null;
  session_label: string | null;
  committee_id: string | null;
  committee_name: string | null;
  source: "manual" | "site";
  site_label: string | null;
  source_url: string;
  stream_url: string | null;
  minutes_url: string | null;
  agenda_pdf_url: string | null;
  result_pdf_url: string | null;
  is_published: boolean;
  confirmed_at: string | null;
  operator_edited_at: string | null;
  fetched_at: string | null;
  pending_update: unknown;
};

export type CommitteeOption = { id: string; name: string };

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//.test(v), {
    message: "URL は http:// か https:// で始めてください",
  });

const optionalText = (max: number) => z.string().trim().max(max);

export const councilMeetingInputSchema = z
  .object({
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "開催日を入力してください"),
    end_date: z
      .string()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
        message: "終了日は YYYY-MM-DD で入力してください",
      }),
    name: z
      .string()
      .trim()
      .min(1, "会議名を入力してください")
      .max(100, "会議名は100文字以内で入力してください"),
    category: z.enum(["plenary", "standing", "special", "steering", "other"]),
    committee_id: z.string().uuid().or(z.literal("")),
    start_time: optionalText(40),
    place: optionalText(60),
    topic: optionalText(500),
    session_label: optionalText(40),
    source_url: optionalUrl,
    stream_url: optionalUrl,
    minutes_url: optionalUrl,
    agenda_pdf_url: optionalUrl,
    result_pdf_url: optionalUrl,
    /** 保存と同時に、確認済みとして公開する */
    publish: z.boolean(),
  })
  .refine((v) => v.end_date === "" || v.end_date >= v.meeting_date, {
    message: "終了日は開催日以降にしてください",
    path: ["end_date"],
  });

export type CouncilMeetingInput = z.infer<typeof councilMeetingInputSchema>;

export type SiteCalendarImportResult = {
  ok: boolean;
  /** 取得に使った月のページ */
  months: string[];
  added: number;
  refreshed: number;
  changed: number;
  removed: number;
  unchanged: number;
  /** 詳細ページを読めなかったなど、運営者に知らせること */
  warnings: string[];
  error?: string;
};
