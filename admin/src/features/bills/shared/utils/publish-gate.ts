/**
 * 公開ゲートの条件（アプリ側）。DB のトリガー enforce_publish_gate と同じ判断をする。
 * 満たしていなければ、公開できない理由を返す。
 */
export type PublishGateInput = {
  is_review_completed: boolean;
  article_kind: "standard" | "ai_generated";
};

export function checkPublishPreconditions(
  bill: PublishGateInput
): string | null {
  if (bill.article_kind === "ai_generated") {
    return "AI自動生成版のままでは公開できません。内容を確認して「通常版」に変えてください";
  }
  if (!bill.is_review_completed) {
    return "記事レビューを完了してから公開してください";
  }
  return null;
}

/** 公開ボタンを押せるか（一覧のバッジで使う） */
export function canPublish(bill: PublishGateInput): boolean {
  return checkPublishPreconditions(bill) === null;
}
