-- 解説がどの生成ジョブ・どの一次資料から作られ、誰が確認したかを残す。
alter table bill_contents
  add column generation_job_id uuid references generation_jobs (id) on delete set null,
  add column source_hash text,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz;
