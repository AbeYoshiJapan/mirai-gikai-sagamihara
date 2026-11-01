/**
 * Docker（ローカル Supabase）が使えない環境で、マイグレーションの SQL とトリガーの動作を
 * PGlite（WASM 版 PostgreSQL）で確かめる。
 *
 * 使い方（リポジトリの外に PGlite を入れてから実行する。pnpm の依存には加えない）:
 *   mkdir -p /tmp/pgcheck && cd /tmp/pgcheck && npm init -y >/dev/null && npm i @electric-sql/pglite
 *   node /path/to/mirai-gikai-sagamihara/scripts/check-migrations.mjs
 *
 * Supabase 固有の auth / storage スキーマは最小限のスタブで置き換える。
 * RLS ポリシーや権限の挙動は確かめない（それは tests/supabase の統合テストで）。
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../supabase/migrations");

const pgliteEntry = path.join(
  process.cwd(),
  "node_modules/@electric-sql/pglite/dist/index.js"
);
let PGlite;
try {
  ({ PGlite } = await import(pathToFileURL(pgliteEntry).href));
} catch {
  console.error(
    `@electric-sql/pglite が見つかりません（${pgliteEntry}）。使い方はこのファイルの先頭を見てください。`
  );
  process.exit(2);
}

const db = new PGlite();

await db.exec(`
  create schema if not exists extensions;
  create or replace function extensions.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_app_meta_data jsonb default '{}'::jsonb,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    last_sign_in_at timestamptz
  );
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
  create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  create schema if not exists storage;
  create table storage.buckets (id text primary key, name text, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
`);

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const f of files) {
  const sql = readFileSync(path.join(migrationsDir, f), "utf8").replace(
    /create extension if not exists "uuid-ossp" with schema extensions;/i,
    ""
  );
  try {
    await db.exec(sql);
  } catch (e) {
    console.error(`❌ ${f}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`✅ ${files.length} 本のマイグレーションを適用できました`);

// ---- トリガーの動作確認 ----
let failures = 0;
const q = async (sql, params) => (await db.query(sql, params)).rows;
const expect = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✅" : "❌"} ${label}: ${JSON.stringify(actual)}`);
  if (!ok) failures++;
};
const expectError = async (label, fn, includes) => {
  try {
    await fn();
    console.log(`❌ ${label}: エラーにならなかった`);
    failures++;
  } catch (e) {
    const ok = e.message.includes(includes);
    console.log(`${ok ? "✅" : "❌"} ${label}: ${e.message.split("\n")[0]}`);
    if (!ok) failures++;
  }
};

const [user] = await q(
  `insert into auth.users (email) values ('admin@example.com') returning id`
);

// sync_bill_legacy_status
expect(
  "status だけの挿入から stage/result を導出",
  (await q(`insert into bills (name, status) values ('a','enacted') returning stage, result, bill_kind`))[0],
  { stage: "decided", result: "passed", bill_kind: "other" }
);
expect(
  "reported は bill_kind=report",
  (await q(`insert into bills (name, status) values ('b','reported') returning stage, bill_kind, status`))[0],
  { stage: null, bill_kind: "report", status: "reported" }
);
const [ord] = await q(
  `insert into bills (name, bill_kind, stage) values ('c','ordinance','in_committee') returning id, status, originating_house`
);
expect("stage から status を導出（status 省略可）", { status: ord.status, house: ord.originating_house }, { status: "in_originating_house", house: "HR" });
expect(
  "decided + rejected → status rejected",
  (await q(`update bills set stage='decided', result='rejected' where id=$1 returning status`, [ord.id]))[0],
  { status: "rejected" }
);
expect(
  "継続審査は審議中",
  (await q(`insert into bills (name, bill_kind, stage, result) values ('d','ordinance','decided','continued') returning status`))[0],
  { status: "in_originating_house" }
);
expect(
  "議決前の result は消える",
  (await q(`insert into bills (name, bill_kind, stage, result) values ('e','budget','in_committee','passed') returning result`))[0],
  { result: null }
);
expect(
  "旧来の status 更新でも stage が追従",
  (await q(`update bills set status='in_receiving_house' where id=$1 returning stage`, [ord.id]))[0],
  { stage: "plenary" }
);

// enforce_publish_gate
await expectError(
  "レビュー未完了の published 挿入は拒否",
  () => q(`insert into bills (name, status, publish_status) values ('g1','introduced','published')`),
  "publish gate"
);
const [g] = await q(
  `insert into bills (name, status, is_review_completed) values ('g2','introduced',true) returning id`
);
await expectError(
  "確認日時なしの公開は拒否",
  () => q(`update bills set publish_status='published' where id=$1`, [g.id]),
  "reviewed_at"
);
await q(`update bills set reviewed_at=now(), reviewed_by=$2 where id=$1`, [g.id, user.id]);
expect(
  "確認済みなら公開でき published_at が入る",
  (await q(`update bills set publish_status='published' where id=$1 returning publish_status, (published_at is not null) as has_published_at`, [g.id]))[0],
  { publish_status: "published", has_published_at: true }
);
expect(
  "レビュー完了を外すと確認記録が消える",
  (await q(`update bills set is_review_completed=false, publish_status='draft' where id=$1 returning reviewed_at, reviewed_by`, [g.id]))[0],
  { reviewed_at: null, reviewed_by: null }
);
await expectError(
  "再公開には再確認が必要",
  () => q(`update bills set publish_status='published' where id=$1`, [g.id]),
  "publish gate"
);

// 制約
await expectError(
  "賛否は会派か議員のどちらかが必要",
  () => q(`insert into vote_records (bill_id, vote) values ($1,'for')`, [ord.id]),
  "vote_records_target_check"
);
expect(
  "会議予定は既定で非公開",
  (await q(`insert into council_meetings (meeting_date, name, category, council_year, source_url) values ('2026-12-01','本会議','plenary',2026,'https://x') returning is_published`))[0],
  { is_published: false }
);

// 意見・質問フォーム（reader_opinions / reader_questions）
const [op] = await q(
  `insert into reader_opinions (bill_id, stance, body) values ($1,'for','賛成') returning status, consent_to_publish, published_at, reviewed_at`,
  [ord.id]
);
expect("意見は既定で非公開（received）", op, {
  status: "received",
  consent_to_publish: false,
  published_at: null,
  reviewed_at: null,
});
const [opRow] = await q(`select id from reader_opinions where bill_id=$1`, [ord.id]);
await expectError(
  "公開に同意のない意見は公開できない",
  () => q(`update reader_opinions set status='published' where id=$1`, [opRow.id]),
  "reader_opinions_publish_requires_consent"
);
expect(
  "同意があれば公開でき published_at / reviewed_at が入る",
  (await q(
    `update reader_opinions set consent_to_publish=true, status='published', reviewed_by=$2 where id=$1 returning (published_at is not null) as has_published_at, (reviewed_at is not null) as has_reviewed_at`,
    [opRow.id, user.id]
  ))[0],
  { has_published_at: true, has_reviewed_at: true }
);
expect(
  "未対応に戻すと公開日時と確認記録が消える",
  (await q(
    `update reader_opinions set status='received' where id=$1 returning published_at, reviewed_at, reviewed_by`,
    [opRow.id]
  ))[0],
  { published_at: null, reviewed_at: null, reviewed_by: null }
);

const [qu] = await q(
  `insert into reader_questions (body, consent_to_publish) values ('一般の質問', true) returning id, status, bill_id`
);
expect("議案に紐づかない質問を受け付け、既定は未回答", { status: qu.status, bill_id: qu.bill_id }, {
  status: "received",
  bill_id: null,
});
await expectError(
  "回答のない質問は公開できない",
  () => q(`update reader_questions set status='published' where id=$1`, [qu.id]),
  "reader_questions_publish_requires_answer"
);
expect(
  "回答を付ければ公開でき answered_at / published_at が入る",
  (await q(
    `update reader_questions set answer_md='回答です', status='published', answered_by=$2 where id=$1 returning (answered_at is not null) as has_answered_at, (published_at is not null) as has_published_at`,
    [qu.id, user.id]
  ))[0],
  { has_answered_at: true, has_published_at: true }
);
await expectError(
  "同意のない質問は回答があっても公開できない",
  () => q(`insert into reader_questions (body, answer_md, status) values ('q','a','published')`),
  "reader_questions_publish_requires_consent"
);
expect(
  "議案を消しても質問は残り bill_id が null になる",
  (await (async () => {
    const [b] = await q(`insert into bills (name) values ('q-bill') returning id`);
    const [qq] = await q(`insert into reader_questions (bill_id, body) values ($1,'議案の質問') returning id`, [b.id]);
    await q(`delete from bills where id=$1`, [b.id]);
    return q(`select bill_id from reader_questions where id=$1`, [qq.id]);
  })())[0],
  { bill_id: null }
);

if (failures > 0) {
  console.error(`❌ ${failures} 件の確認に失敗しました`);
  process.exit(1);
}
console.log("✅ トリガーと制約の確認がすべて通りました");
