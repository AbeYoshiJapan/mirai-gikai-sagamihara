-- 公開ゲートが記録する「初めて公開した日時」を専用の列にする。
-- bills.published_at は本家の列名変更（published_at → submitted_date）の途中にある古い列で、
-- トリガー sync_bills_published_submitted が submitted_date と同期している。公開ゲートが
-- published_at を書くと提出日が公開日時で上書きされてしまうため、別の列を使う。
alter table bills add column first_published_at timestamptz;

comment on column bills.first_published_at is '初めて公開中にした日時（公開ゲートが記録）。published_at は提出日の古い別名なので使わない';

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
    if new.first_published_at is null then
      new.first_published_at := now();
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
