-- 読者（市民）から議会・議案への質問。
-- 投稿は既定で非公開（received）。管理者が回答を書き、投稿者が公開に同意した
-- 質問だけを「よくある質問」として公開できる。回答のない質問は公開できない。
create type reader_question_status as enum ('received', 'answered', 'published', 'closed');

create table reader_questions (
  id uuid primary key default gen_random_uuid(),
  -- 議案に紐づかない一般の質問は null
  bill_id uuid references bills (id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  -- 返信先（任意）。公開しない
  contact text not null default '' check (char_length(contact) <= 200),
  consent_to_publish boolean not null default false,
  status reader_question_status not null default 'received',
  -- 公開用に言い換えた質問文（空なら原文を出す）
  question_summary text not null default '' check (char_length(question_summary) <= 1000),
  answer_md text not null default '',
  answered_by uuid references auth.users (id) on delete set null,
  answered_at timestamptz,
  published_at timestamptz,
  -- 連投対策用のハッシュ。生の IP アドレスは保存しない
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_questions_publish_requires_consent
    check (status <> 'published' or consent_to_publish),
  constraint reader_questions_publish_requires_answer
    check (status <> 'published' or char_length(answer_md) > 0)
);

create index reader_questions_bill_status_idx
  on reader_questions (bill_id, status, created_at desc);

create index reader_questions_status_created_idx
  on reader_questions (status, created_at desc);

create trigger update_reader_questions_updated_at
  before update on reader_questions
  for each row execute function update_updated_at_column();

-- status の変化に合わせて answered_at / published_at を揃える
create or replace function sync_reader_question_timestamps()
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
    new.answered_at := null;
    new.answered_by := null;
  elsif new.answered_at is null then
    new.answered_at := now();
  end if;

  return new;
end;
$$;

create trigger sync_reader_question_timestamps
  before insert or update on reader_questions
  for each row execute function sync_reader_question_timestamps();

alter table reader_questions enable row level security;

comment on table reader_questions is '読者からの質問。既定は非公開で、回答を付けて管理者が公開する';
comment on column reader_questions.contact is '返信先（メールアドレスなど）。公開しない';
comment on column reader_questions.question_summary is '公開用に言い換えた質問文。空なら原文を表示する';
comment on column reader_questions.ip_hash is '連投対策用のハッシュ。生の IP は保存しない';
