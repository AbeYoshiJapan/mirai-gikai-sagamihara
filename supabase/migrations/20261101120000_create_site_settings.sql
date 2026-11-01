-- サイト設定。セクション名（site / operator / brand / links / council / ai / import / features / legal / seo）ごとに JSON を 1 行。
-- スキーマは packages/shared/src/site-settings/schema.ts。読み書きは admin client 経由、認可はアプリ層（本家の方針と同じ）。
create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table site_settings enable row level security;

-- 変更履歴（差し戻し用）。保存のたびに変更前の値を残す。
create table site_setting_history (
  id         bigserial primary key,
  key        text not null,
  value      jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null
);
create index site_setting_history_key_changed_at_idx on site_setting_history (key, changed_at desc);
alter table site_setting_history enable row level security;

-- ロゴ・OGP・運営者写真などサイトの画像。公開読み取り。
insert into storage.buckets (id, name, public) values ('site-assets', 'site-assets', true);
create policy "Public read site assets" on storage.objects for select using (bucket_id = 'site-assets');
