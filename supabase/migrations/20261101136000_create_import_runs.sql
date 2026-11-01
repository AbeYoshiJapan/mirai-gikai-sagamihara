-- 議会サイトからの取込の実行記録。取込は下書きまでで、公開は管理人が行う。
create type import_run_status as enum ('running', 'succeeded', 'failed', 'skipped');

create table import_runs (
  id uuid primary key default gen_random_uuid(),
  -- サイト設定 import.sources の id
  source_id text not null,
  adapter text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status import_run_status not null default 'running',
  dry_run boolean not null default false,
  -- {"added": 3, "updated": 1, "skipped": 10, "errors": 0}
  summary jsonb not null default '{}'::jsonb,
  log text,
  triggered_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index import_runs_source_started_idx on import_runs (source_id, started_at desc);

alter table import_runs enable row level security;
