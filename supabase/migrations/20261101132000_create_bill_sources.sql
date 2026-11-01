-- 議案の一次資料（議案書 PDF・審議結果・会議録・中継など）。
-- 公開ページの「一次資料」欄に出し、解説生成の入力（extracted_text）にもなる。
create type bill_source_kind as enum (
  'bill_pdf',             -- 議案書
  'agenda_pdf',           -- 付議事件一覧・議事日程
  'result_pdf',           -- 審議結果
  'committee_result_pdf', -- 委員会審査結果
  'minutes_plenary',      -- 本会議の会議録
  'minutes_committee',    -- 委員会の会議録
  'video',                -- 中継・録画
  'newsletter',           -- 議会だより
  'city_page',            -- 市のページ（条例案の概要・パブコメなど）
  'other'
);

create table bill_sources (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills (id) on delete cascade,
  kind bill_source_kind not null default 'other',
  url text not null,
  label text not null default '',
  -- 会議録・録画なら会議の日
  meeting_date date,
  sort_order integer not null default 0,
  fetched_at timestamptz,
  content_hash text,
  -- 取込で抽出した本文。解説生成の入力。公開ページには出さない
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bill_sources_bill_id_idx on bill_sources (bill_id, sort_order);

create trigger update_bill_sources_updated_at
  before update on bill_sources
  for each row execute function update_updated_at_column();

alter table bill_sources enable row level security;

comment on table bill_sources is '議案の一次資料へのリンクと抽出本文';
