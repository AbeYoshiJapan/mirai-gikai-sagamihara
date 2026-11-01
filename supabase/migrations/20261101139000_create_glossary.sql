-- 用語解説。公開ページの用語リンクに使う。is_published = true だけ公開。
create table glossary (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  reading text not null default '',
  definition_md text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_term_unique unique (term)
);

create trigger update_glossary_updated_at
  before update on glossary
  for each row execute function update_updated_at_column();

alter table glossary enable row level security;
