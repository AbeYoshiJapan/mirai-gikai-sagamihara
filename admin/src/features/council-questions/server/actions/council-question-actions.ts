"use server";

import { normalizeMemberName } from "@mirai-gikai/shared/council-questions/types";
import type { Json } from "@mirai-gikai/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { routes } from "@/lib/routes";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { QuestionImportResult } from "../../shared/types";
import { collectBillRefs } from "../../shared/utils/build-question-import";
import { parseItemsOutline } from "../../shared/utils/items-outline";
import { resolveNoticePageUrl } from "../../shared/utils/notice-source";
import { isNoticeContentEdited } from "../../shared/utils/question-review-state";
import {
  deleteQuestions,
  findQuestionById,
  replaceQuestionThemeLinks,
  updateQuestion,
} from "../repositories/council-question-repository";
import { importCouncilQuestions } from "../services/import-council-questions";

const idSchema = z.string().uuid();
const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\//.test(value), {
    message: "URL は http:// か https:// で始めてください",
  });

async function refreshPublic(meetingKey: string) {
  await invalidateWebCache([WEB_CACHE_TAGS.COUNCIL_QUESTIONS]);
  revalidatePath(routes.councilQuestions());
  revalidatePath(routes.councilQuestionMeeting(meetingKey));
}

/** 通告一覧を議会サイトから読み、仮登録する（公開はしない） */
export async function importCouncilQuestionsAction(input: {
  meetingKey?: string;
  pdfUrls?: { representative?: string; general?: string; order?: string };
}): Promise<QuestionImportResult> {
  try {
    await requireAdmin();
    const { settings } = await loadSiteSettings();
    const result = await importCouncilQuestions({
      pageUrl: resolveNoticePageUrl({
        billsPage: settings.links.bills_page,
        importSources: settings.import.sources,
      }),
      meetingKey: input.meetingKey?.trim() || null,
      pdfUrls: input.pdfUrls,
    });
    revalidatePath(routes.councilQuestions());
    if (result.ok)
      revalidatePath(routes.councilQuestionMeeting(result.meetingKey));
    return result;
  } catch (error) {
    console.error("Import council questions error:", error);
    return {
      ok: false,
      error: getErrorMessage(error, "通告一覧の取込に失敗しました"),
      warnings: [],
    };
  }
}

const saveSchema = z.object({
  kind: z.enum(["representative", "individual", "general"]),
  seatNumber: z.number().int().positive().nullable(),
  memberName: z.string().trim().min(1, "氏名を入れてください").max(60),
  factionLabel: z.string().trim().max(60),
  method: z.string().trim().max(30),
  questionDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "質問日は YYYY-MM-DD で入れてください",
    }),
  streamUrl: optionalUrl,
  minutesUrl: optionalUrl,
  itemsOutline: z.string().max(20_000),
  themeLinks: z
    .array(
      z.object({
        item_number: z.number().int().positive(),
        tag_id: z.string().uuid(),
      })
    )
    .max(200),
});

export type SaveCouncilQuestionInput = z.input<typeof saveSchema>;

/** 運営者が直した内容を保存する（取込で上書きしなくなる） */
export async function saveCouncilQuestionAction(
  id: string,
  input: SaveCouncilQuestionInput
): Promise<{ error?: string }> {
  try {
    const admin = await requireAdmin();
    const questionId = idSchema.safeParse(id);
    if (!questionId.success) return { error: "質問の ID が不正です" };
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "入力を確かめてください",
      };
    }
    const items = parseItemsOutline(parsed.data.itemsOutline);
    if (!items.ok) return { error: items.error };

    const current = await findQuestionById(questionId.data);
    if (!current) return { error: "質問が見つかりません" };

    const data = parsed.data;
    const fields = {
      kind: data.kind,
      seat_number: data.seatNumber,
      // 議員ごとのページで同じ人にまとめるため、氏名の空白は取る
      member_name: normalizeMemberName(data.memberName),
      faction_label: data.factionLabel,
      method: data.method || null,
      question_date: data.questionDate || null,
      items: items.items,
    };
    // 通告一覧から読んだ内容を直したときだけ「運営者が手を入れた」にする
    const contentEdited = isNoticeContentEdited(current, fields);
    await updateQuestion(questionId.data, {
      ...fields,
      stream_url: data.streamUrl || null,
      minutes_url: data.minutesUrl || null,
      items: items.items as unknown as Json,
      bill_refs: collectBillRefs(items.items),
      operator_edited_at: contentEdited
        ? new Date().toISOString()
        : current.operator_edited_at,
    });
    const itemNumbers = new Set(
      items.items.map((item) => Number.parseInt(item.label, 10))
    );
    await replaceQuestionThemeLinks(
      questionId.data,
      data.themeLinks.filter((link) => itemNumbers.has(link.item_number)),
      admin.id
    );

    if (current.is_published) await refreshPublic(current.meeting_key);
    else revalidatePath(routes.councilQuestionMeeting(current.meeting_key));
    return {};
  } catch (error) {
    console.error("Save council question error:", error);
    return { error: getErrorMessage(error, "保存に失敗しました") };
  }
}

/** 確認して公開する（確認した日時と人を残す） */
export async function confirmCouncilQuestionsAction(
  ids: string[]
): Promise<{ error?: string; confirmed?: number }> {
  try {
    const admin = await requireAdmin();
    const parsed = z.array(idSchema).min(1).max(100).safeParse(ids);
    if (!parsed.success) return { error: "公開する質問を選んでください" };
    let meetingKey: string | null = null;
    for (const id of parsed.data) {
      const question = await findQuestionById(id);
      if (!question) continue;
      if (question.items.length === 0) {
        return { error: `${question.member_name}さんの質問に項目がありません` };
      }
      meetingKey = question.meeting_key;
      await updateQuestion(id, {
        is_published: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: admin.id,
      });
    }
    if (meetingKey) await refreshPublic(meetingKey);
    return { confirmed: parsed.data.length };
  } catch (error) {
    console.error("Confirm council questions error:", error);
    return { error: getErrorMessage(error, "公開に失敗しました") };
  }
}

/** 公開をやめる（仮登録に戻す） */
export async function unpublishCouncilQuestionAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { error: "質問の ID が不正です" };
    const question = await findQuestionById(parsed.data);
    if (!question) return { error: "質問が見つかりません" };
    await updateQuestion(parsed.data, { is_published: false });
    await refreshPublic(question.meeting_key);
    return {};
  } catch (error) {
    console.error("Unpublish council question error:", error);
    return { error: getErrorMessage(error, "公開をやめられませんでした") };
  }
}

/** 公式の通告一覧の変更を反映する（見比べたうえでの運営者の操作なので、確認の記録も付け直す） */
export async function applyQuestionPendingUpdateAction(
  id: string
): Promise<{ error?: string; deleted?: boolean }> {
  try {
    const admin = await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { error: "質問の ID が不正です" };
    const question = await findQuestionById(parsed.data);
    if (!question?.pending_update) return { error: "反映する変更がありません" };

    const pending = question.pending_update;
    if (pending.kind === "removed") {
      await deleteQuestions([parsed.data]);
      if (question.is_published) await refreshPublic(question.meeting_key);
      return { deleted: true };
    }
    const draft = pending.draft;
    await updateQuestion(parsed.data, {
      seat_number: draft.seatNumber,
      member_name: draft.memberName,
      faction_label: draft.factionLabel,
      method: draft.method,
      question_date: draft.questionDate,
      notice_date: draft.noticeDate,
      items: draft.items as unknown as Json,
      bill_refs: collectBillRefs(draft.items),
      source_url: draft.sourceUrl,
      site_snapshot: draft as unknown as Json,
      pending_update: null,
      operator_edited_at: null,
      ...(question.is_published
        ? { confirmed_at: new Date().toISOString(), confirmed_by: admin.id }
        : {}),
    });
    if (question.is_published) await refreshPublic(question.meeting_key);
    return {};
  } catch (error) {
    console.error("Apply question pending update error:", error);
    return { error: getErrorMessage(error, "反映に失敗しました") };
  }
}

/** 公式の通告一覧の変更を反映せず、このままにする（同じ変更は次の取込で出ない） */
export async function dismissQuestionPendingUpdateAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { error: "質問の ID が不正です" };
    const question = await findQuestionById(parsed.data);
    if (!question?.pending_update) return {};
    const pending = question.pending_update;
    await updateQuestion(parsed.data, {
      pending_update: null,
      ...(pending.kind === "changed"
        ? { site_snapshot: pending.draft as unknown as Json }
        : {}),
    });
    revalidatePath(routes.councilQuestionMeeting(question.meeting_key));
    return {};
  } catch (error) {
    console.error("Dismiss question pending update error:", error);
    return { error: getErrorMessage(error, "保留を消せませんでした") };
  }
}

export async function deleteCouncilQuestionAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { error: "質問の ID が不正です" };
    const question = await findQuestionById(parsed.data);
    if (!question) return {};
    await deleteQuestions([parsed.data]);
    if (question.is_published) await refreshPublic(question.meeting_key);
    else revalidatePath(routes.councilQuestionMeeting(question.meeting_key));
    return {};
  } catch (error) {
    console.error("Delete council question error:", error);
    return { error: getErrorMessage(error, "削除に失敗しました") };
  }
}
