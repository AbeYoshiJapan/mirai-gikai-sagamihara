import { createAdminClient } from "../shared/helper";
import { bills, contents, sessions, tags } from "./data";
import {
  BICYCLE_PLAN_NAME,
  bicycleInterview,
  bicycleQuestions,
} from "./data-plans";
import { tablesToLists } from "./markdown";

/**
 * 墨田区版のデータを、消さずに足す・直す。公開後の議案の追加・更新はこれで行う。
 *
 * - 会期は slug、タグは label、議案は name、解説は（議案, 難易度）で突き合わせる
 * - 無ければ足し、あれば data の内容で上書きする。議案の id は変わらないので、
 *   AIインタビューの回答や議案とのつながりはそのまま残る
 * - 何も消さない。data から外した議案も DB には残る（消すときは手で）
 * - インタビュー設定は、その議案にまだ無いときだけ足す（既存の設定と回答には触らない）
 *
 * 既定は確認だけ（書き込まない）。`--apply` を付けたときだけ書き込む。
 *   dotenv -e .env.production -- pnpm --filter @mirai-gikai/seed sync:sumida
 *   dotenv -e .env.production -- pnpm --filter @mirai-gikai/seed sync:sumida --apply
 */

const apply = process.argv.includes("--apply");

type Row = Record<string, unknown>;

/** data の値と DB の値が違う列だけを返す（data に無い列は比べない）。 */
function changedFields(next: Row, current: Row): Row {
  const diff: Row = {};
  for (const [key, value] of Object.entries(next)) {
    const now = current[key];
    const same =
      value === now ||
      (value == null && now == null) ||
      // timestamptz は "2026-06-29T00:00:00+00:00" のように返るので時刻で比べる
      (typeof value === "string" &&
        typeof now === "string" &&
        !Number.isNaN(Date.parse(value)) &&
        /^\d{4}-\d{2}-\d{2}/.test(value) &&
        Date.parse(value) === Date.parse(now));
    if (!same) diff[key] = value;
  }
  return diff;
}

/** 1000件ずつ全件読む（PostgREST の上限対策）。 */
async function selectAll<T>(
  supabase: ReturnType<typeof createAdminClient>,
  table: "diet_sessions" | "tags" | "bills" | "bill_contents" | "bills_tags",
  columns: string,
  orderBy = "id"
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function syncSumida() {
  const supabase = createAdminClient();
  const log = { added: [] as string[], updated: [] as string[] };

  // 会期
  const dbSessions = await selectAll<Row & { id: string; slug: string }>(
    supabase,
    "diet_sessions",
    "*"
  );
  const sessionBySlug = new Map(dbSessions.map((s) => [s.slug, s]));
  for (const session of sessions) {
    const current = sessionBySlug.get(session.slug as string);
    if (!current) {
      log.added.push(`会期 ${session.name}`);
      if (apply) {
        const { data, error } = await supabase
          .from("diet_sessions")
          .insert(session)
          .select("*")
          .single();
        if (error) throw new Error(`会期: ${error.message}`);
        sessionBySlug.set(data.slug as string, data as typeof current & Row);
      }
      continue;
    }
    const diff = changedFields(session as Row, current);
    if (Object.keys(diff).length === 0) continue;
    log.updated.push(`会期 ${session.name}（${Object.keys(diff).join("・")}）`);
    if (apply) {
      const { error } = await supabase
        .from("diet_sessions")
        .update(diff)
        .eq("id", current.id);
      if (error) throw new Error(`会期: ${error.message}`);
    }
  }

  /** 提出日（日本時間）が入る議会年度の会期 id。確認だけのときは未登録の会期で null になる。 */
  const sessionIdFor = (submittedDate: string | null | undefined) => {
    const day = new Date(submittedDate ?? Date.now()).toLocaleDateString(
      "sv-SE",
      { timeZone: "Asia/Tokyo" }
    );
    const session = [...sessionBySlug.values()].find(
      (s) =>
        (s.start_date as string) <= day && day <= (s.end_date as string)
    );
    if (!session && apply) throw new Error(`会期が見つかりません: ${submittedDate}`);
    return session?.id ?? null;
  };

  // タグ
  const dbTags = await selectAll<{ id: string; label: string }>(
    supabase,
    "tags",
    "id, label"
  );
  const tagIdByLabel = new Map(dbTags.map((t) => [t.label, t.id]));
  for (const tag of tags) {
    if (tagIdByLabel.has(tag.label)) continue;
    log.added.push(`タグ ${tag.label}`);
    if (apply) {
      const { data, error } = await supabase
        .from("tags")
        .insert(tag)
        .select("id, label")
        .single();
      if (error) throw new Error(`タグ: ${error.message}`);
      tagIdByLabel.set(data.label, data.id);
    }
  }

  // 議案
  const dbBills = await selectAll<Row & { id: string; name: string }>(
    supabase,
    "bills",
    "*"
  );
  const billByName = new Map(dbBills.map((b) => [b.name, b]));
  const billIdByName = new Map(dbBills.map((b) => [b.name, b.id]));
  for (const { tag: _tag, ...bill } of bills) {
    const next = { ...bill, diet_session_id: sessionIdFor(bill.submitted_date) };
    const current = billByName.get(bill.name);
    if (!current) {
      log.added.push(`議案 ${bill.name}`);
      if (apply) {
        const { data, error } = await supabase
          .from("bills")
          // 未指定のカラムを null ではなく DEFAULT にする（配列で渡したときだけ効く）
          .insert([next], { defaultToNull: false })
          .select("id, name")
          .single();
        if (error) throw new Error(`議案 ${bill.name}: ${error.message}`);
        billIdByName.set(data.name, data.id);
      }
      continue;
    }
    // 確認だけのときに未登録の会期が null になるのを差分にしない
    if (next.diet_session_id === null) delete (next as Row).diet_session_id;
    // 掲載日は DB 側の値（提出日に揃えてある）を正とし、既存の議案では上書きしない
    delete (next as Row).published_at;
    const diff = changedFields(next as Row, current);
    if (Object.keys(diff).length === 0) continue;
    log.updated.push(`議案 ${bill.name}（${Object.keys(diff).join("・")}）`);
    if (apply) {
      const { error } = await supabase
        .from("bills")
        .update(diff)
        .eq("id", current.id);
      if (error) throw new Error(`議案 ${bill.name}: ${error.message}`);
    }
  }

  // 解説
  const dbContents = await selectAll<
    Row & { id: string; bill_id: string; difficulty_level: string }
  >(supabase, "bill_contents", "*");
  const contentByKey = new Map(
    dbContents.map((c) => [`${c.bill_id}:${c.difficulty_level}`, c])
  );
  for (const { bill_name, ...content } of contents) {
    const billId = billIdByName.get(bill_name);
    const next = { ...content, content: tablesToLists(content.content) };
    const label = `解説 ${bill_name}（${content.difficulty_level}）`;
    const current = billId
      ? contentByKey.get(`${billId}:${content.difficulty_level}`)
      : undefined;
    if (!current) {
      log.added.push(label);
      if (apply) {
        const { error } = await supabase
          .from("bill_contents")
          .insert({ ...next, bill_id: billId as string });
        if (error) throw new Error(`${label}: ${error.message}`);
      }
      continue;
    }
    const diff = changedFields(next as Row, current);
    if (Object.keys(diff).length === 0) continue;
    log.updated.push(`${label}（${Object.keys(diff).join("・")}）`);
    if (apply) {
      const { error } = await supabase
        .from("bill_contents")
        .update(diff)
        .eq("id", current.id);
      if (error) throw new Error(`${label}: ${error.message}`);
    }
  }

  // 議案とタグのつながり（足すだけ）
  const dbBillTags = await selectAll<{ bill_id: string; tag_id: string }>(
    supabase,
    "bills_tags",
    "bill_id, tag_id",
    "bill_id"
  );
  const billTagKeys = new Set(dbBillTags.map((bt) => `${bt.bill_id}:${bt.tag_id}`));
  for (const bill of bills) {
    const billId = billIdByName.get(bill.name);
    const tagId = tagIdByLabel.get(bill.tag);
    if (billId && tagId && billTagKeys.has(`${billId}:${tagId}`)) continue;
    log.added.push(`議案タグ ${bill.name} → ${bill.tag}`);
    if (apply) {
      const { error } = await supabase
        .from("bills_tags")
        .insert({ bill_id: billId as string, tag_id: tagId as string });
      if (error) throw new Error(`議案タグ ${bill.name}: ${error.message}`);
    }
  }

  // 行政計画の意見募集（その議案にまだ設定が無いときだけ足す）
  const bicycleBillId = billIdByName.get(BICYCLE_PLAN_NAME);
  const { data: existingConfigs, error: configReadError } = await supabase
    .from("interview_configs")
    .select("id")
    .eq("bill_id", bicycleBillId ?? "00000000-0000-0000-0000-000000000000");
  if (configReadError) throw new Error(`インタビュー設定: ${configReadError.message}`);
  if (!existingConfigs?.length) {
    log.added.push(`インタビュー設定 ${BICYCLE_PLAN_NAME}`);
    if (apply) {
      const { data: config, error } = await supabase
        .from("interview_configs")
        .insert({ ...bicycleInterview, bill_id: bicycleBillId as string })
        .select("id")
        .single();
      if (error) throw new Error(`インタビュー設定: ${error.message}`);
      const { error: questionError } = await supabase
        .from("interview_questions")
        .insert(
          bicycleQuestions.map((q) => ({ ...q, interview_config_id: config.id }))
        );
      if (questionError) throw new Error(`インタビュー質問: ${questionError.message}`);
    }
  }

  const show = (title: string, items: string[]) => {
    console.log(`\n${title} ${items.length}件`);
    for (const item of items.slice(0, 50)) console.log(`  - ${item}`);
    if (items.length > 50) console.log(`  …ほか${items.length - 50}件`);
  };
  console.log(apply ? "✅ 書き込みました" : "🔍 確認だけ（書き込むときは --apply）");
  show("追加", log.added);
  show("更新", log.updated);
}

syncSumida().catch((error) => {
  console.error(error);
  process.exit(1);
});
