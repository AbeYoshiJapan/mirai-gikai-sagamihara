import type { ReaderQuestionKind } from "@mirai-gikai/shared/reader-posts/labels";

/** 質問か意見かで変わる、フォームと一覧の言葉 */
export type InquiryKindTexts = {
  /** 本文の欄の名前 */
  bodyLabel: string;
  placeholder: string;
  /** 公開への同意の文 */
  consent: string;
  /** 送ったあとのお礼 */
  thanks: string;
  /** 公開中の一覧で、送られた文と返事の前に付ける印 */
  postMark: string;
  replyMark: string;
};

export const INQUIRY_KIND_TEXTS: Record<ReaderQuestionKind, InquiryKindTexts> =
  {
    question: {
      bodyLabel: "質問",
      placeholder: "議会のしくみ、議案、このサイトについて知りたいことなど",
      consent:
        "この質問と回答を、運営者の確認のうえで「よくある質問」としてこのサイトに公開してよい（質問の文は運営者が言い換えることがあります）",
      thanks:
        "ご質問ありがとうございます。運営者が内容を確認し、回答できるものには回答します。返信先をいただいた場合は、そちらにお返事することがあります。",
      postMark: "Q.",
      replyMark: "A.",
    },
    opinion: {
      bodyLabel: "意見",
      placeholder: "議会や市政について思うこと、このサイトへの要望など",
      consent:
        "この意見と運営者の返事を、運営者の確認のうえでこのサイトに公開してよい（意見の文は運営者が言い換えることがあります）",
      thanks:
        "ご意見ありがとうございます。運営者が内容を確認します。返信先をいただいた場合は、そちらにお返事することがあります。",
      postMark: "意見",
      replyMark: "返事",
    },
  };
