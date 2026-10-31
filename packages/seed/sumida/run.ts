import { clearAllData, createAdminClient } from "../shared/helper";
import { bills, contents, sessions, tags } from "./data";
import {
  BICYCLE_PLAN_NAME,
  bicycleInterview,
  bicycleQuestions,
} from "./data-plans";
import { tablesToLists } from "./markdown";

/**
 * 墨田区版のデータを入れ直す。既存データはすべて消える。
 * 公開後は AIインタビューの回答も消えるので使わない。議案の追加・更新は sync.ts（sync:sumida）で行う。
 */
async function seedSumida() {
  const supabase = createAdminClient();

  // 公開後の誤操作で回答を消さないよう、インタビューの記録があれば止める
  const { count, error: countError } = await supabase
    .from("interview_sessions")
    .select("id", { count: "exact", head: true });
  if (countError) throw new Error(`インタビュー記録の確認: ${countError.message}`);
  if ((count ?? 0) > 0 && !process.argv.includes("--force")) {
    throw new Error(
      `インタビューの記録が${count}件あります。消さずに足すときは sync:sumida を使ってください（どうしても消すときだけ --force）`
    );
  }

  await clearAllData(supabase);

  const { data: insertedSessions, error: sessionError } = await supabase
    .from("diet_sessions")
    .insert(sessions)
    .select("id, start_date, end_date");
  if (sessionError) throw new Error(`会期: ${sessionError.message}`);

  /** 提出日（日本時間）が入る議会年度の会期を返す。 */
  const sessionIdFor = (submittedDate: string | null | undefined) => {
    const day = new Date(submittedDate ?? Date.now()).toLocaleDateString(
      "sv-SE",
      { timeZone: "Asia/Tokyo" }
    );
    const session = insertedSessions.find(
      (s) => s.start_date <= day && day <= s.end_date
    );
    if (!session) throw new Error(`会期が見つかりません: ${submittedDate}`);
    return session.id;
  };

  const { data: insertedTags, error: tagError } = await supabase
    .from("tags")
    .insert(tags)
    .select("id, label");
  if (tagError) throw new Error(`タグ: ${tagError.message}`);

  const { data: insertedBills, error: billError } = await supabase
    .from("bills")
    .insert(
      bills.map(({ tag: _tag, ...bill }) => ({
        ...bill,
        diet_session_id: sessionIdFor(bill.submitted_date),
      })),
      // 一括insertで未指定のカラムを null ではなく DEFAULT にする
      { defaultToNull: false }
    )
    .select("id, name");
  if (billError) throw new Error(`議案: ${billError.message}`);

  const billIdByName = new Map(insertedBills.map((b) => [b.name, b.id]));
  const tagIdByLabel = new Map(insertedTags.map((t) => [t.label, t.id]));

  const { error: contentError } = await supabase.from("bill_contents").insert(
    contents.map(({ bill_name, ...content }) => ({
      ...content,
      content: tablesToLists(content.content),
      bill_id: billIdByName.get(bill_name) as string,
    }))
  );
  if (contentError) throw new Error(`解説: ${contentError.message}`);

  const { error: billTagError } = await supabase.from("bills_tags").insert(
    bills.map((bill) => ({
      bill_id: billIdByName.get(bill.name) as string,
      tag_id: tagIdByLabel.get(bill.tag) as string,
    }))
  );
  if (billTagError) throw new Error(`議案タグ: ${billTagError.message}`);

  // 行政計画の意見募集（AIインタビュー）
  const { data: config, error: configError } = await supabase
    .from("interview_configs")
    .insert({
      ...bicycleInterview,
      bill_id: billIdByName.get(BICYCLE_PLAN_NAME) as string,
    })
    .select("id")
    .single();
  if (configError) throw new Error(`インタビュー設定: ${configError.message}`);

  const { error: questionError } = await supabase
    .from("interview_questions")
    .insert(
      bicycleQuestions.map((q) => ({ ...q, interview_config_id: config.id }))
    );
  if (questionError) throw new Error(`インタビュー質問: ${questionError.message}`);

  console.log(
    `✅ 会期${insertedSessions.length}・議案${insertedBills.length}・解説${contents.length}件を投入`
  );
}

seedSumida().catch((error) => {
  console.error(error);
  process.exit(1);
});
