-- 公開ゲート。議案を published にできるのは、レビュー完了（is_review_completed）で
-- 確認日時（reviewed_at）が記録された行だけ。確認者（reviewed_by）は分かるときに記録する
-- （seed やプレビュー環境では admin ユーザーが無いことがある）。
-- アプリ側（admin の公開操作）でも同じ条件を確認するが、取込・MCP・手作業の SQL でも
-- すり抜けないよう DB でも守る。
alter table bills
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz,
  add column published_by uuid references auth.users (id) on delete set null;

comment on column bills.reviewed_by is '記事レビューを完了にした管理者';
comment on column bills.published_by is '公開操作をした管理者';

-- 既存の公開済み行は移行時点で確認済みとみなす（確認者は不明なので null のまま）
-- ゲートは「published への変更」にだけかかるので、既存行はそのまま公開が続く。

create or replace function enforce_publish_gate()
returns trigger
language plpgsql
as $$
begin
  if new.publish_status = 'published'
     and (tg_op = 'INSERT' or old.publish_status is distinct from 'published') then
    if not new.is_review_completed then
      raise exception 'publish gate: 記事レビューが完了していない議案は公開できません (bill %)', new.id
        using errcode = 'check_violation';
    end if;
    if new.reviewed_at is null then
      raise exception 'publish gate: 確認日時（reviewed_at）が記録されていない議案は公開できません (bill %)', new.id
        using errcode = 'check_violation';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  -- レビュー完了を外したら確認記録も外す（再確認が必要）
  if tg_op = 'UPDATE' and old.is_review_completed and not new.is_review_completed then
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

create trigger enforce_publish_gate
  before insert or update on bills
  for each row execute function enforce_publish_gate();
