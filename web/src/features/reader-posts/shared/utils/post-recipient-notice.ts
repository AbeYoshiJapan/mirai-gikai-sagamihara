/**
 * 意見・質問フォームの送り先と対応者の案内。
 * だれに届くのかを投稿する方に示すため、運営者の名前を入れる（名前が未設定なら「運営者」だけ）。
 */
export function buildPostRecipientNotice(operatorName: string): string {
  const name = operatorName.trim();
  const recipient = name ? `運営者である${name}` : "運営者";
  return `意見や質問は、${recipient}に届き、運営者が対応します。あらかじめご了承ください。`;
}
