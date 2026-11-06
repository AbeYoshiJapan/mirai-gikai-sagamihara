-- 公開中の議案は、いつでも「運営者の確認（レビュー完了）が済んだもの」だけにする。
--
-- これまでの公開ゲートは「下書き → 公開」に変える瞬間だけを見ていたので、公開した後に
-- 本文が差し替わる（AI 生成の反映、MCP からの書き込みなど）と、未確認の内容が公開されたままに
-- なりえた。確認が外れた（is_review_completed = false になった）公開中の議案は、その場で
-- 下書きに戻す。再公開には運営者の確認と公開操作が要る（公開ゲートがもう一度かかる）。
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

  -- 公開中のまま確認が外れた行は、公開を取り下げて下書きに戻す
  if new.publish_status = 'published' and not new.is_review_completed then
    new.publish_status := 'draft';
  end if;

  return new;
end;
$$;

comment on function enforce_publish_gate() is
  '公開ゲート。公開には記事レビュー完了と確認日時が要る。公開中に確認が外れたら下書きに戻す（公開中＝運営者が確認済み）';

-- 既に「公開中だが未確認」の行があれば下書きに戻す（トリガーが publish_status を書き換える）
update bills
set is_review_completed = false
where publish_status = 'published'
  and not is_review_completed;
