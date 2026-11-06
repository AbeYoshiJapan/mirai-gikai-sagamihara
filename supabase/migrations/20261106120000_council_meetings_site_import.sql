-- 会議予定を管理画面で入力し、議会サイトのカレンダーから自動で「仮登録」できるようにする。
--
-- 掲載方針：自動で集めたものは仮の取得。運営者が確認して公開したものだけを公開サイトに出す。
-- 公開中（is_published）の行は、確認日時（confirmed_at）を必ず持つ（CHECK 制約）。
-- 確認済みの行を自動取得が書き換えることはない。公式サイト側の変更は pending_update に
-- 「変更あり」として残し、運営者が反映するか無視するかを決める。

alter table council_meetings
  -- manual = 管理画面で入力、site = 議会サイトのカレンダーから取得
  add column source text not null default 'manual'
    check (source in ('manual', 'site')),
  -- カレンダーの表記（略称）。例: 議運、総務
  add column site_label text,
  -- 前回の取得で公式サイトから読めた値。次の取得で「公式サイトが変わったか」を判定する
  add column site_snapshot jsonb,
  add column fetched_at timestamptz,
  -- 運営者が管理画面で手を入れた日時。手を入れた行は自動取得で上書きしない
  add column operator_edited_at timestamptz,
  -- 運営者が確認して公開した日時と人
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references auth.users (id) on delete set null,
  -- 公式サイト側の変更・削除の保留（{kind: "changed", fields, previous} / {kind: "removed"}）
  add column pending_update jsonb;

-- これまでに公開していた行（手入力分）は確認済みとみなす
update council_meetings
set confirmed_at = coalesce(updated_at, now())
where is_published and confirmed_at is null;

alter table council_meetings
  add constraint council_meetings_published_requires_confirmation
  check (not is_published or confirmed_at is not null);

-- 同じ会議を二重に取り込まない（議会サイトの詳細ページの URL が会議ごとに一意）
create unique index council_meetings_site_source_url_key
  on council_meetings (source_url)
  where source = 'site';

create index council_meetings_review_idx
  on council_meetings (is_published, meeting_date)
  where pending_update is not null or not is_published;

comment on column council_meetings.source is 'manual = 管理画面で入力、site = 議会サイトのカレンダーから取得（仮登録）';
comment on column council_meetings.site_snapshot is '前回の取得で公式サイトから読めた値（変更の検出用）';
comment on column council_meetings.operator_edited_at is '運営者が管理画面で手を入れた日時。手を入れた行は自動取得で上書きしない';
comment on column council_meetings.confirmed_at is '運営者が確認して公開した日時。公開中の行は必須';
comment on column council_meetings.pending_update is '公式サイト側の変更・削除の保留。運営者が反映するか無視するかを決める';
