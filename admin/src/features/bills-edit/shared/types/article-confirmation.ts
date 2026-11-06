/** 「記事の確認」欄に出す状態 */
export type ArticleConfirmationState = {
  confirmed: boolean;
  /** 確認した日時（日本時間） */
  confirmedAtLabel: string | null;
  /** 確認した管理者のメールアドレス（分からなければ null） */
  confirmedBy: string | null;
  /** AI 生成の「要確認」の残り。残っている間は確認済みにできない */
  unresolvedCount: number;
};
