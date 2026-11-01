-- 議会の委員会（常任・特別・議会運営・予算特別・決算特別）。
-- 議案の付託先（bills.committee_id）、会議予定（council_meetings.committee_id）、
-- 委員会単位の賛否から参照する。管理画面「委員会」で編集する。
create type committee_kind as enum (
  'standing',   -- 常任委員会
  'special',    -- 特別委員会
  'steering',   -- 議会運営委員会
  'budget',     -- 予算特別委員会
  'settlement', -- 決算特別委員会
  'other'
);

create table committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null default '',
  kind committee_kind not null default 'standing',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- 設置・廃止の時期（特別委員会など）。常設なら null
  since date,
  until date,
  -- 分科会は親委員会を指す
  parent_id uuid references committees (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint committees_name_unique unique (name)
);

create index committees_sort_order_idx on committees (sort_order);

create trigger update_committees_updated_at
  before update on committees
  for each row execute function update_updated_at_column();

alter table committees enable row level security;

comment on table committees is '議会の委員会。議案の付託先・会議予定・賛否の集計単位';
