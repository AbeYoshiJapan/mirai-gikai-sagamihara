-- 解説の生成ジョブ。管理画面から実行し、結果は下書きとして bill_contents に入る。
create type generation_job_kind as enum (
  'summary_normal',
  'content_normal',
  'content_hard',
  'tags',
  'glossary',
  'translation'
);

create type generation_job_status as enum ('queued', 'running', 'succeeded', 'failed', 'discarded');

create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills (id) on delete cascade,
  kind generation_job_kind not null,
  model text not null,
  prompt_version text not null default '',
  -- 入力（一次資料の本文）のハッシュ。同じ入力の再生成を避ける
  input_hash text,
  status generation_job_status not null default 'queued',
  output jsonb,
  error text,
  cost_usd numeric(10, 6),
  created_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generation_jobs_bill_id_idx on generation_jobs (bill_id, created_at desc);

create trigger update_generation_jobs_updated_at
  before update on generation_jobs
  for each row execute function update_updated_at_column();

alter table generation_jobs enable row level security;
