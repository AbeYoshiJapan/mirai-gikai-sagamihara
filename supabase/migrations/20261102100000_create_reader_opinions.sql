-- 読者（市民）から議案への意見。
-- 投稿は既定で非公開（received）。公開は管理画面で確認した管理者だけが行い、
-- 投稿者が公開に同意していない意見は DB 制約で公開できない。
create type reader_opinion_stance as enum ('for', 'against', 'neutral', 'unsure');

create type reader_opinion_status as enum ('received', 'published', 'rejected');

create table reader_opinions (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills (id) on delete cascade,
  stance reader_opinion_stance not null,
  body text not null check (char_length(body) between 1 and 1000),
  -- 公開時に表示する名前（任意）。空なら「匿名」として扱う
  display_name text not null default '' check (char_length(display_name) <= 30),
  -- 任意の属性（居住区分・年代など）。個人を特定しない範囲に限る
  attributes jsonb not null default '{}'::jsonb,
  consent_to_publish boolean not null default false,
  status reader_opinion_status not null default 'received',
  -- 運営者からの返信（公開時に本文と一緒に表示）
  reply_md text not null default '',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  -- 連投対策用のハッシュ。生の IP アドレスは保存しない
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_opinions_publish_requires_consent
    check (status <> 'published' or consent_to_publish)
);

create index reader_opinions_bill_status_idx
  on reader_opinions (bill_id, status, created_at desc);

create index reader_opinions_status_created_idx
  on reader_opinions (status, created_at desc);

create trigger update_reader_opinions_updated_at
  before update on reader_opinions
  for each row execute function update_updated_at_column();

-- status の変化に合わせて reviewed_at / published_at を揃える
create or replace function sync_reader_opinion_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at := now();
    end if;
  else
    new.published_at := null;
  end if;

  if new.status = 'received' then
    new.reviewed_at := null;
    new.reviewed_by := null;
  elsif new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

create trigger sync_reader_opinion_timestamps
  before insert or update on reader_opinions
  for each row execute function sync_reader_opinion_timestamps();

alter table reader_opinions enable row level security;

comment on table reader_opinions is '読者からの議案への意見。既定は非公開で、管理者が確認してから公開する';
comment on column reader_opinions.consent_to_publish is '投稿者が公開に同意したか。false の意見は status を published にできない';
comment on column reader_opinions.attributes is '任意の属性（residence / age_group）。個人を特定しない範囲';
comment on column reader_opinions.ip_hash is '連投対策用のハッシュ。生の IP は保存しない';
