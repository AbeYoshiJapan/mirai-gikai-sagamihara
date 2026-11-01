-- 会派・議員・賛否。表示は機能フラグ（faction_votes / member_votes）で切り替える。
create table factions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint factions_name_unique unique (name)
);

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kana text not null default '',
  -- 選挙区（例: 南区）
  ward text not null default '',
  faction_id uuid references factions (id) on delete set null,
  term_start date,
  term_end date,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type vote_value as enum ('for', 'against', 'abstain', 'absent', 'chair');

create table vote_records (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills (id) on delete cascade,
  -- 会派単位か議員単位のどちらか
  faction_id uuid references factions (id) on delete cascade,
  member_id uuid references members (id) on delete cascade,
  vote vote_value not null,
  source_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vote_records_target_check check (
    (faction_id is not null and member_id is null) or (faction_id is null and member_id is not null)
  ),
  constraint vote_records_bill_faction_unique unique (bill_id, faction_id),
  constraint vote_records_bill_member_unique unique (bill_id, member_id)
);

create index vote_records_bill_id_idx on vote_records (bill_id);

create trigger update_factions_updated_at
  before update on factions
  for each row execute function update_updated_at_column();
create trigger update_members_updated_at
  before update on members
  for each row execute function update_updated_at_column();
create trigger update_vote_records_updated_at
  before update on vote_records
  for each row execute function update_updated_at_column();

alter table factions enable row level security;
alter table members enable row level security;
alter table vote_records enable row level security;
