-- 議会での質問（代表質問・個人質疑・一般質問）と、テーマ（タグを広げたもの）とのひも付け。
--
-- 議会が公表する通告一覧の PDF から仮登録し（is_published = false）、運営者が確認して公開する。
-- 公開には確認した日時が要る（DB の制約）。全員を公式の順番・同じ形式で載せ、項目は通告の文言のまま持つ。

create table council_questions (
  id uuid primary key default gen_random_uuid(),
  -- 定例会議の鍵（例: 2026-09）と名前（例: 令和8年9月定例会議）
  meeting_key text not null check (meeting_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  meeting_name text not null,
  -- どちらの通告一覧から来たか。順位はそれぞれの一覧の中の番号
  list_kind text not null check (list_kind in ('representative', 'general')),
  -- 代表質問・個人質疑・一般質問（代表質問・個人質疑の一覧は、取込で仮に分け、運営者が直せる）
  kind text not null check (kind in ('representative', 'individual', 'general')),
  order_no integer not null check (order_no > 0),
  seat_number integer check (seat_number is null or seat_number > 0),
  member_name text not null check (member_name <> ''),
  -- 通告一覧に書かれた会派の略称（そのときの会派）
  faction_label text not null default '',
  -- 一括／一問一答／一括・一問一答
  method text,
  question_date date,
  notice_date date,
  -- 項目の木（[{label, level, text, children}]）。通告の文言のまま
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  -- 項目に出てくる議案などの番号（例: 議案第99号）。議案のページとつなぐ
  bill_refs text[] not null default '{}',
  source_url text,
  stream_url text,
  minutes_url text,
  -- 前回の取込で通告一覧から読めた内容（変更の検出用）
  site_snapshot jsonb,
  fetched_at timestamptz,
  -- 運営者が管理画面で手を入れた日時。手を入れた行は取込で上書きしない
  operator_edited_at timestamptz,
  -- 公開済み・手を入れた行で、公式の通告一覧が変わった・無くなったときの保留
  pending_update jsonb,
  is_published boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint council_questions_published_requires_confirmation
    check (not is_published or confirmed_at is not null),
  constraint council_questions_meeting_list_order_key
    unique (meeting_key, list_kind, order_no)
);

create index council_questions_meeting_idx
  on council_questions (meeting_key, is_published);
create index council_questions_member_idx
  on council_questions (member_name)
  where is_published;
create index council_questions_bill_refs_idx
  on council_questions using gin (bill_refs);
create index council_questions_review_idx
  on council_questions (meeting_key)
  where pending_update is not null or not is_published;

create trigger update_council_questions_updated_at
  before update on council_questions
  for each row execute function update_updated_at_column();

alter table council_questions enable row level security;

comment on table council_questions is '議会での質問（通告一覧から仮登録し、運営者が確認して公開）';
comment on column council_questions.items is '項目の木（通告の文言のまま）。1 → (1) → ア → （ア） → ａ → （ａ）';
comment on column council_questions.confirmed_at is '運営者が確認して公開した日時。公開中の行は必須';
comment on column council_questions.operator_edited_at is '運営者が管理画面で手を入れた日時。手を入れた行は取込で上書きしない';
comment on column council_questions.pending_update is '公式の通告一覧の変更・削除の保留。運営者が反映するか無視するかを決める';

-- テーマ：いまのタグを広げて使う（議案に付けたタグがそのままテーマになる）
alter table tags
  add column is_theme boolean not null default false,
  add column theme_order integer not null default 0;

comment on column tags.is_theme is 'テーマのページを公開する（議案・議会での質問を束ねて見せる）';
comment on column tags.theme_order is 'テーマ一覧での並び順（小さいほど先）';

-- 質問の項目（「1」「2」…の大きな項目）とテーマのひも付け。運営者だけが付ける
create table council_question_themes (
  question_id uuid not null references council_questions (id) on delete cascade,
  -- 大きな項目の番号（1, 2, …）。取込で項目を入れ替えても、番号でつながったままにする
  item_number integer not null check (item_number > 0),
  tag_id uuid not null references tags (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (question_id, item_number, tag_id)
);

create index council_question_themes_tag_idx
  on council_question_themes (tag_id);

alter table council_question_themes enable row level security;

comment on table council_question_themes is '議会での質問の項目とテーマ（タグ）のひも付け';
