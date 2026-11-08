-- 管理画面「PR・広報」で、X などに投稿したことの記録。
-- 投稿そのものは運営者が自分のアカウントで行う（自動投稿はしない）。ここは「どの話題をいつ投稿したか」を残し、
-- 同じ話題を二度投稿しないように見るためだけに使う。
create table pr_post_logs (
  id uuid primary key default gen_random_uuid(),
  -- 何についての投稿か（議案・会議の予定・議会での質問・意見・質問への回答・その他）
  source_type text not null
    check (source_type in ('bill', 'meeting', 'council_questions', 'reader_opinions', 'reader_question', 'other')),
  -- 話題の ID（議案の ID、会議の ID、定例会議の鍵 2026-12 など）
  source_id text not null check (char_length(source_id) between 1 and 200),
  channel text not null default 'x' check (channel in ('x')),
  -- 投稿した文（運営者が直したあとのもの）
  body text not null check (char_length(body) between 1 and 2000),
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table pr_post_logs is '「PR・広報」で投稿したことの記録（投稿は運営者が手で行う）';

create index pr_post_logs_source_idx on pr_post_logs (source_type, source_id, posted_at desc);
create index pr_post_logs_posted_at_idx on pr_post_logs (posted_at desc);

alter table pr_post_logs enable row level security;
