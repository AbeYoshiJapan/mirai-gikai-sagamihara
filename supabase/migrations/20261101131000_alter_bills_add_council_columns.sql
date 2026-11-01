-- 地方議会向けの議案列。国会由来の status（衆参の審議）に代えて
-- 議案の種類（bill_kind）・審議段階（stage）・結果（result）で表す。
-- 既存の status は互換のため残し、トリガーで stage／result／bill_kind から導出する。

create type bill_kind as enum (
  'ordinance',          -- 条例
  'budget',             -- 予算
  'settlement',         -- 決算
  'contract',           -- 契約
  'personnel',          -- 人事
  'property',           -- 財産の取得・処分
  'road',               -- 市道の認定・廃止
  'senketsu',           -- 専決処分の承認・報告
  'member_bill',        -- 議員提出議案
  'opinion',            -- 意見書
  'resolution',         -- 決議
  'petition',           -- 請願
  'citizen_petition',   -- 陳情
  'report',             -- 委員会報告（審議・採決なし）
  'plan',               -- 行政計画（パブリックコメントなど）
  'special_committee',  -- 特別委員会の議題
  'other'
);

create type bill_proposer_kind as enum (
  'mayor',      -- 市長提出
  'member',     -- 議員提出
  'committee',  -- 委員会提出
  'citizen'     -- 市民（請願・陳情）
);

create type bill_stage as enum (
  'preparing',    -- 提出前
  'submitted',    -- 提出（本会議上程）
  'referred',     -- 委員会付託
  'in_committee', -- 委員会審査中
  'plenary',      -- 本会議で採決待ち
  'decided'       -- 議決済み
);

create type bill_result as enum (
  'passed',       -- 可決
  'rejected',     -- 否決
  'approved',     -- 承認（専決処分など）
  'consented',    -- 同意（人事など）
  'adopted',      -- 採択（請願・陳情）
  'not_adopted',  -- 不採択
  'continued',    -- 継続審査
  'withdrawn'     -- 撤回
);

create type bill_vote_outcome as enum (
  'unanimous', -- 全会一致
  'majority',  -- 賛成多数
  'minority',  -- 賛成少数
  'none'       -- 採決なし
);

alter table bills
  add column bill_number text,
  add column bill_kind bill_kind not null default 'other',
  add column proposer_kind bill_proposer_kind not null default 'mayor',
  add column committee_id uuid references committees (id) on delete set null,
  add column stage bill_stage,
  add column decided_on date,
  add column result bill_result,
  add column vote_outcome bill_vote_outcome,
  -- 議案書 PDF（議会サイト）
  add column bill_document_url text;

comment on column bills.bill_number is '議案番号（例: 議案第99号、請願第3号）';
comment on column bills.bill_kind is '議案の種類';
comment on column bills.proposer_kind is '提出者の区分';
comment on column bills.committee_id is '付託先の委員会';
comment on column bills.stage is '審議段階。status はここから導出する';
comment on column bills.result is '議決の結果。stage = decided のときに入る';
comment on column bills.vote_outcome is '採決の結果（全会一致・賛成多数など）';

create index idx_bills_committee_id on bills (committee_id);
create index idx_bills_stage on bills (stage);

-- 新規登録で提出院を求めない（地方議会は一院制）。status は stage から導出するので既定値を置く
alter table bills alter column originating_house set default 'HR';
alter table bills alter column status set default 'preparing';

-- 既存行の移行：status から bill_kind／stage／result を埋める
update bills set bill_kind = 'report' where status = 'reported';
update bills set bill_kind = 'plan' where status = 'plan';
update bills set bill_kind = 'special_committee' where status = 'special_committee';
update bills set
  stage = case status
    when 'preparing' then 'preparing'::bill_stage
    when 'introduced' then 'submitted'::bill_stage
    when 'in_originating_house' then 'in_committee'::bill_stage
    when 'in_receiving_house' then 'plenary'::bill_stage
    when 'enacted' then 'decided'::bill_stage
    when 'rejected' then 'decided'::bill_stage
    else null
  end,
  result = case status
    when 'enacted' then 'passed'::bill_result
    when 'rejected' then 'rejected'::bill_result
    else null
  end;

-- status と stage／result／bill_kind を同期するトリガー。
-- stage を書いた更新は status を導出し、status だけを書いた更新（旧来の経路）は stage を導出する。
create or replace function sync_bill_legacy_status()
returns trigger
language plpgsql
as $$
declare
  legacy_write boolean;
begin
  if tg_op = 'INSERT' then
    legacy_write := new.stage is null and new.bill_kind = 'other';
  else
    legacy_write := new.status is distinct from old.status
      and new.stage is not distinct from old.stage
      and new.result is not distinct from old.result
      and new.bill_kind is not distinct from old.bill_kind;
  end if;

  if legacy_write then
    if new.status = 'reported' then
      new.bill_kind := 'report';
      new.stage := null;
      new.result := null;
    elsif new.status = 'plan' then
      new.bill_kind := 'plan';
      new.stage := null;
      new.result := null;
    elsif new.status = 'special_committee' then
      new.bill_kind := 'special_committee';
      new.stage := null;
      new.result := null;
    else
      new.stage := case new.status
        when 'preparing' then 'preparing'::bill_stage
        when 'introduced' then 'submitted'::bill_stage
        when 'in_originating_house' then 'in_committee'::bill_stage
        when 'in_receiving_house' then 'plenary'::bill_stage
        else 'decided'::bill_stage
      end;
      new.result := case new.status
        when 'enacted' then 'passed'::bill_result
        when 'rejected' then 'rejected'::bill_result
        else null
      end;
    end if;
    return new;
  end if;

  -- 通常の経路：stage／result／bill_kind から status を導出する
  if new.bill_kind = 'report' then
    new.status := 'reported';
  elsif new.bill_kind = 'plan' then
    new.status := 'plan';
  elsif new.bill_kind = 'special_committee' then
    new.status := 'special_committee';
  else
    new.status := case new.stage
      when 'submitted' then 'introduced'::bill_status_enum
      when 'referred' then 'in_originating_house'::bill_status_enum
      when 'in_committee' then 'in_originating_house'::bill_status_enum
      when 'plenary' then 'in_receiving_house'::bill_status_enum
      when 'decided' then (
        case
          when new.result in ('rejected', 'not_adopted', 'withdrawn') then 'rejected'::bill_status_enum
          when new.result = 'continued' then 'in_originating_house'::bill_status_enum
          else 'enacted'::bill_status_enum
        end
      )
      else 'preparing'::bill_status_enum
    end;
  end if;

  -- 議決済みでないのに結果が入っている、は矛盾なので揃える
  if new.stage is distinct from 'decided' and new.bill_kind not in ('report', 'plan', 'special_committee') then
    new.result := null;
    new.vote_outcome := null;
  end if;

  return new;
end;
$$;

create trigger sync_bill_legacy_status
  before insert or update on bills
  for each row execute function sync_bill_legacy_status();
