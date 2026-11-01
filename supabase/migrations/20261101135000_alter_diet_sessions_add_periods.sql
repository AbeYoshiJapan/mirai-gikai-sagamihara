-- 会期（通年議会の議会年度）に定例会議ごとの期間を明示する。
-- 要素: {"name": "9月定例会議", "start_date": "2026-08-27", "end_date": "2026-09-30"}
alter table diet_sessions
  add column meeting_periods jsonb not null default '[]'::jsonb;

alter table diet_sessions
  add constraint diet_sessions_meeting_periods_is_array
  check (jsonb_typeof(meeting_periods) = 'array');

comment on column diet_sessions.meeting_periods is '定例会議・臨時会議の期間の配列。空なら council_meetings から導出する';
