-- サイトの文言で、「運営者（阿部善博）が確認した」のように名前を添えている所を「運営者が確認した」にする。
-- 既定文を保存したまま使っている設定（掲載方針・正式な手続きの違い・インタビューの同意文・通年議会の説明など）に、
-- コードの既定文の変更（2026-11-09）を反映するため。
-- 運営者がだれかを示す文（利用規約の「以下「運営者」といいます」、運営者情報、「公式サイトではありません」の注記など）は変えない。

-- 1) 差し込み記号のまま保存されている文（既定文）
update site_settings
set value = replace(value::text, '運営者（{{operator_name}}）', '運営者')::jsonb
where value::text like '%運営者（{{operator_name}}）%';

-- 2) 名前をじかに書いて保存されている文（例: 運営者（阿部善博））
--    名前に JSON で特別な意味を持つ文字（" と \）があるときは触らない
update site_settings s
set value = replace(s.value::text, '運営者（' || (o.value ->> 'name') || '）', '運営者')::jsonb
from site_settings o
where o.key = 'operator'
  and coalesce(o.value ->> 'name', '') <> ''
  and (o.value ->> 'name') !~ '["\\]'
  and s.value::text like '%運営者（' || (o.value ->> 'name') || '）%';

-- 3) 「サイト名について」の注記：運営者の紹介欄がすぐ下にあるので、ここでは名前を繰り返さない
update site_settings
set value = replace(
  value::text,
  '{{operator_title}}の{{operator_name}}が個人で作って運営しています',
  '運営者が個人で作って運営しています'
)::jsonb
where key = 'site'
  and value::text like '%{{operator_title}}の{{operator_name}}が個人で作って運営しています%';
