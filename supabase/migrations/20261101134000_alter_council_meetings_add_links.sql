-- 会議予定に中継・会議録・資料へのリンクと、委員会・会議期間・公開フラグを足す。
-- 取込は is_published = false で入れ、管理画面の「反映」で公開する。
alter table council_meetings
  add column stream_url text,
  add column minutes_url text,
  add column agenda_pdf_url text,
  add column result_pdf_url text,
  -- 会議期間の表示名（例: 9月定例会議）
  add column session_label text,
  add column committee_id uuid references committees (id) on delete set null,
  add column is_published boolean not null default false;

-- 既存行（手動で入れたもの）は公開のまま
update council_meetings set is_published = true;

create index council_meetings_is_published_idx on council_meetings (is_published, meeting_date);
