-- 質問フォーム（トップの「質問・意見の窓」など）から届くものに、質問か意見かの区別を付ける。
-- 意見でも、運営者が確認して返事を付け、同意があれば「質問と回答」と同じ流れで公開できる。
alter table reader_questions
  add column kind text not null default 'question'
    check (kind in ('question', 'opinion'));

comment on column reader_questions.kind is '質問（question）か意見（opinion）か。トップの窓で送り手が選ぶ';
