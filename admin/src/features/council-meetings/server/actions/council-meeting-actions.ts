"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { routes } from "@/lib/routes";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  councilMeetingInputSchema,
  type SiteCalendarImportResult,
} from "../../shared/types";
import { readPendingUpdate } from "../../shared/utils/meeting-review-state";
import {
  jstDateKey,
  pendingChangeColumns,
  toMeetingColumns,
} from "../../shared/utils/meeting-rows";
import {
  confirmMeetings,
  deleteMeeting,
  findMeetingById,
  insertMeeting,
  updateMeeting,
} from "../repositories/council-meeting-repository";
import { importSiteCalendar } from "../services/import-site-calendar";

type ActionResult = { error?: string };

async function afterChange() {
  // 公開中の会議予定が変わりうるので、公開サイトのキャッシュを捨てる
  await invalidateWebCache([WEB_CACHE_TAGS.COUNCIL_MEETINGS]);
  revalidatePath(routes.councilMeetings());
}

/**
 * 会議予定を保存する。id が null なら新規（手入力）。
 * 「確認済みとして公開する」を付けて保存したときだけ公開し、確認した人と日時を残す。
 * 保存は運営者の確認でもあるので、自動取得の上書き対象から外し、公式サイトの変更の保留も消す。
 */
export async function saveCouncilMeetingAction(
  id: string | null,
  input: unknown
): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = councilMeetingInputSchema.parse(input);
    const { settings } = await loadSiteSettings();
    const now = new Date().toISOString();
    const columns = toMeetingColumns(parsed, {
      yearStartMonth: settings.council.year_start_month,
      defaultSourceUrl:
        settings.links.schedule_page || settings.links.council_site || "",
    });
    const publishColumns = parsed.publish
      ? { is_published: true, confirmed_at: now, confirmed_by: admin.id }
      : { is_published: false };

    if (id) {
      await updateMeeting(id, {
        ...columns,
        ...publishColumns,
        operator_edited_at: now,
        pending_update: null,
      });
      await afterChange();
      return { id };
    }
    const newId = await insertMeeting({
      ...columns,
      ...publishColumns,
      source: "manual",
      operator_edited_at: now,
    });
    await afterChange();
    return { id: newId };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "入力内容に誤りがあります" };
    }
    console.error("Save council meeting error:", error);
    return { error: getErrorMessage(error, "会議予定の保存に失敗しました") };
  }
}

/** 選んだ会議予定を、確認済みとして公開する */
export async function confirmCouncilMeetingsAction(
  ids: string[]
): Promise<ActionResult & { count?: number }> {
  try {
    const admin = await requireAdmin();
    const count = await confirmMeetings(ids, admin.id);
    await afterChange();
    return { count };
  } catch (error) {
    console.error("Confirm council meetings error:", error);
    return { error: getErrorMessage(error, "会議予定の公開に失敗しました") };
  }
}

export async function unpublishCouncilMeetingAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await updateMeeting(id, { is_published: false });
    await afterChange();
    return {};
  } catch (error) {
    console.error("Unpublish council meeting error:", error);
    return { error: getErrorMessage(error, "公開の取り下げに失敗しました") };
  }
}

export async function deleteCouncilMeetingAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deleteMeeting(id);
    await afterChange();
    return {};
  } catch (error) {
    console.error("Delete council meeting error:", error);
    return { error: getErrorMessage(error, "会議予定の削除に失敗しました") };
  }
}

/**
 * 公式サイトの変更を反映する。反映は運営者の確認なので、公開中なら確認日時も新しくする。
 */
export async function applyPendingUpdateAction(
  id: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const meeting = await findMeetingById(id);
    if (!meeting) return { error: "会議予定が見つかりません" };
    const pending = readPendingUpdate(meeting.pending_update);
    if (!pending) return { error: "反映する変更がありません" };
    const { settings } = await loadSiteSettings();
    const columns = pendingChangeColumns(
      pending,
      settings.council.year_start_month
    );
    if (!columns) {
      return {
        error: "公式サイトから消えた会議は、削除するか「無視」を選んでください",
      };
    }
    const now = new Date().toISOString();
    await updateMeeting(id, {
      ...columns,
      pending_update: null,
      operator_edited_at: now,
      ...(meeting.is_published && {
        confirmed_at: now,
        confirmed_by: admin.id,
      }),
    });
    await afterChange();
    return {};
  } catch (error) {
    console.error("Apply pending update error:", error);
    return { error: getErrorMessage(error, "変更の反映に失敗しました") };
  }
}

/** 公式サイトの変更・削除を無視する（今の内容のままにする） */
export async function dismissPendingUpdateAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await updateMeeting(id, {
      pending_update: null,
      operator_edited_at: new Date().toISOString(),
    });
    revalidatePath(routes.councilMeetings());
    return {};
  } catch (error) {
    console.error("Dismiss pending update error:", error);
    return { error: getErrorMessage(error, "保留の取り消しに失敗しました") };
  }
}

/** 議会サイトのカレンダーから今すぐ取得して、仮登録する */
export async function fetchSiteCalendarAction(): Promise<SiteCalendarImportResult> {
  try {
    const admin = await requireAdmin();
    const result = await importSiteCalendar({
      triggeredBy: admin.id,
      today: jstDateKey(),
    });
    revalidatePath(routes.councilMeetings());
    return result;
  } catch (error) {
    console.error("Fetch site calendar error:", error);
    return {
      ok: false,
      months: [],
      added: 0,
      refreshed: 0,
      changed: 0,
      removed: 0,
      unchanged: 0,
      warnings: [],
      error: getErrorMessage(error, "取得に失敗しました"),
    };
  }
}
