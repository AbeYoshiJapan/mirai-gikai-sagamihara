import "server-only";

import type { Json } from "@mirai-gikai/supabase";
import {
  fetchSiteBytes,
  fetchSitePage,
} from "@/features/council-meetings/server/utils/fetch-site-text";
import type {
  ParsedNoticeList,
  ParsedQuestionOrder,
  QuestionImportResult,
  QuestionPendingUpdate,
} from "../../shared/types";
import {
  buildQuestionDrafts,
  type CouncilQuestionDraft,
  planQuestionImport,
  snapshotOf,
} from "../../shared/utils/build-question-import";
import { findNoticeLinks } from "../../shared/utils/find-notice-links";
import {
  meetingKeyOf,
  meetingNameOf,
  parseMeetingKey,
} from "../../shared/utils/notice-text";
import { parseNoticeList } from "../../shared/utils/parse-notice";
import { parseQuestionOrder } from "../../shared/utils/parse-question-order";
import { extractPdfLines } from "../../shared/utils/pdf-lines";
import {
  deleteQuestions,
  findExistingQuestionsForImport,
  insertQuestions,
  updateQuestion,
} from "../repositories/council-question-repository";

export type ImportQuestionsInput = {
  /** 議会サイトの「提出議案・発言通告」ページ。PDF の URL を直接渡すときは要らない */
  pageUrl?: string | null;
  /** 取り込む定例会議（例: 2026-12）。空ならページでいちばん新しい定例会議 */
  meetingKey?: string | null;
  /** 通告一覧の PDF を直接指定する */
  pdfUrls?: {
    representative?: string | null;
    general?: string | null;
    order?: string | null;
  };
};

export type ImportQuestionsDeps = {
  fetchPage: (url: string) => Promise<string>;
  fetchPdf: (url: string) => Promise<Uint8Array>;
  now: () => Date;
};

const defaultDeps: ImportQuestionsDeps = {
  fetchPage: async (url) => (await fetchSitePage(url)).text,
  fetchPdf: (url) => fetchSiteBytes(url),
  now: () => new Date(),
};

function toFields(draft: CouncilQuestionDraft) {
  return {
    seat_number: draft.seatNumber,
    member_name: draft.memberName,
    faction_label: draft.factionLabel,
    method: draft.method,
    question_date: draft.questionDate,
    notice_date: draft.noticeDate,
    items: draft.items as unknown as Json,
    bill_refs: draft.billRefs,
    source_url: draft.sourceUrl,
  };
}

/**
 * 議会サイトの通告一覧（代表質問・個人質疑、一般質問）と一般質問順位を読み、議会での質問を仮登録する。
 * 公開はしない。公開済み・運営者が手を入れた質問は書き換えず、公式の内容が変わったことだけ残す。
 */
export async function importCouncilQuestions(
  input: ImportQuestionsInput,
  deps: ImportQuestionsDeps = defaultDeps
): Promise<QuestionImportResult> {
  const warnings: string[] = [];
  const requested = input.meetingKey ? parseMeetingKey(input.meetingKey) : null;
  if (input.meetingKey && !requested) {
    return { ok: false, error: "定例会議の指定が正しくありません", warnings };
  }

  let urls = {
    representative: input.pdfUrls?.representative?.trim() || null,
    general: input.pdfUrls?.general?.trim() || null,
    order: input.pdfUrls?.order?.trim() || null,
  };
  let meeting = requested;

  if (!urls.representative && !urls.general) {
    const pageUrl = input.pageUrl?.trim();
    if (!pageUrl) {
      return {
        ok: false,
        error:
          "通告一覧を探すページが決まっていません（サイト設定「リンク」の議案のページ）",
        warnings,
      };
    }
    let html: string;
    try {
      html = await deps.fetchPage(pageUrl);
    } catch (error) {
      return {
        ok: false,
        error: `${pageUrl} を読めませんでした（${error instanceof Error ? error.message : String(error)}）`,
        warnings,
      };
    }
    const groups = findNoticeLinks(html, pageUrl);
    const group = requested
      ? groups.find(
          (g) => g.meetingKey === meetingKeyOf(requested.year, requested.month)
        )
      : groups[0];
    if (!group) {
      return {
        ok: false,
        error: requested
          ? `${meetingNameOf(requested.year, requested.month)}の通告一覧がページにありません`
          : "ページに通告一覧の PDF が見つかりませんでした（まだ載っていないかもしれません）",
        warnings,
      };
    }
    urls = {
      representative: group.representativeUrl,
      general: group.generalUrl,
      order: group.orderUrl,
    };
    meeting ??= group.meetingKey ? parseMeetingKey(group.meetingKey) : null;
  }

  const read = async <T>(
    url: string | null,
    label: string,
    parse: (lines: Awaited<ReturnType<typeof extractPdfLines>>) => T
  ): Promise<T | null> => {
    if (!url) return null;
    try {
      return parse(await extractPdfLines(await deps.fetchPdf(url)));
    } catch (error) {
      warnings.push(
        `${label}を読めませんでした（${error instanceof Error ? error.message : String(error)}）`
      );
      return null;
    }
  };

  const representative = await read<ParsedNoticeList>(
    urls.representative,
    "代表質問・個人質疑通告一覧",
    parseNoticeList
  );
  const general = await read<ParsedNoticeList>(
    urls.general,
    "一般質問通告一覧",
    parseNoticeList
  );
  const order = await read<ParsedQuestionOrder>(
    urls.order,
    "一般質問順位",
    parseQuestionOrder
  );

  for (const notice of [representative, general]) {
    warnings.push(...(notice?.warnings ?? []));
  }
  warnings.push(...(order?.warnings ?? []));

  if (!meeting && order?.year && order.month) {
    meeting = { year: order.year, month: order.month };
  }
  if (!meeting) {
    return {
      ok: false,
      error:
        "どの定例会議の通告一覧か分かりませんでした。定例会議を選んでください",
      warnings,
    };
  }
  if (!representative && !general) {
    return {
      ok: false,
      error: "通告一覧を読めませんでした",
      warnings,
    };
  }

  const meetingKey = meetingKeyOf(meeting.year, meeting.month);
  const meetingName = meetingNameOf(meeting.year, meeting.month);
  const built = buildQuestionDrafts({
    meetingKey,
    meetingName,
    representative: representative
      ? { notice: representative, url: urls.representative }
      : undefined,
    general: general ? { notice: general, url: urls.general } : undefined,
    order: order ? { parsed: order, url: urls.order } : undefined,
  });
  warnings.push(...built.warnings);

  const importedLists = [
    ...(representative ? (["representative"] as const) : []),
    ...(general ? (["general"] as const) : []),
  ];
  const plan = planQuestionImport(
    built.drafts,
    await findExistingQuestionsForImport(meetingKey),
    importedLists
  );

  const now = deps.now().toISOString();
  await insertQuestions(
    plan.inserts.map((draft) => ({
      meeting_key: draft.meetingKey,
      meeting_name: draft.meetingName,
      list_kind: draft.listKind,
      kind: draft.kind,
      order_no: draft.order,
      ...toFields(draft),
      site_snapshot: snapshotOf(draft) as unknown as Json,
      fetched_at: now,
      is_published: false,
    }))
  );
  for (const { id, draft } of plan.updates) {
    await updateQuestion(id, {
      kind: draft.kind,
      ...toFields(draft),
      site_snapshot: snapshotOf(draft) as unknown as Json,
      fetched_at: now,
      pending_update: null,
    });
  }
  for (const { id, draft } of plan.pending) {
    const pending: QuestionPendingUpdate = {
      kind: "changed",
      draft: snapshotOf(draft),
      detectedAt: now,
    };
    await updateQuestion(id, {
      pending_update: pending as unknown as Json,
      fetched_at: now,
    });
  }
  await deleteQuestions(
    plan.removed.filter((row) => !row.locked).map((row) => row.id)
  );
  for (const row of plan.removed.filter((r) => r.locked)) {
    const pending: QuestionPendingUpdate = { kind: "removed", detectedAt: now };
    await updateQuestion(row.id, {
      pending_update: pending as unknown as Json,
    });
  }

  return {
    ok: true,
    meetingKey,
    meetingName,
    inserted: plan.inserts.length,
    updated: plan.updates.length,
    pending:
      plan.pending.length + plan.removed.filter((row) => row.locked).length,
    removed: plan.removed.filter((row) => !row.locked).length,
    unchanged: plan.unchanged,
    sources: [
      urls.representative && {
        label: "代表質問・個人質疑通告一覧",
        url: urls.representative,
      },
      urls.general && { label: "一般質問通告一覧", url: urls.general },
      urls.order && { label: "一般質問順位", url: urls.order },
    ].filter((source): source is { label: string; url: string } =>
      Boolean(source)
    ),
    warnings,
  };
}
