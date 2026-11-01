import type {
  ReaderOpinionAttributes,
  ReaderOpinionStance,
} from "@mirai-gikai/shared/reader-posts/labels";

export type SubmitReaderPostResult =
  | { ok: true }
  | { ok: false; error: string };

export const READER_POST_FAILED_MESSAGE =
  "送信に失敗しました。しばらく待ってから再度お試しください";

export const READER_POST_RATE_LIMITED_MESSAGE =
  "送信が多すぎます。しばらく待ってから再度お試しください";

export const READER_POST_BILL_NOT_FOUND_MESSAGE =
  "この議案は意見・質問を受け付けていません";

/** 公開ページに出す意見（公開に同意し、管理者が公開したものだけ） */
export type PublicReaderOpinion = {
  id: string;
  stance: ReaderOpinionStance;
  body: string;
  display_name: string;
  attributes: ReaderOpinionAttributes;
  reply_md: string;
  published_at: string | null;
};

/** 公開ページに出す質問と回答（よくある質問） */
export type PublicReaderQuestion = {
  id: string;
  bill_id: string | null;
  bill_name: string | null;
  question: string;
  answer_md: string;
  published_at: string | null;
};
