type DbError = {
  code: string;
  message: string;
};

type BillOperation = "create" | "update";

const CHECK_VIOLATION = "23514";
const AI_GENERATED_REVIEW_CONSTRAINT = "chk_ai_generated_not_review_completed";

export function mapBillDbError(
  error: DbError,
  operation: BillOperation
): string {
  if (
    error.code === CHECK_VIOLATION &&
    error.message.includes(AI_GENERATED_REVIEW_CONSTRAINT)
  ) {
    return "AI自動生成版の記事は確認済みにできません。記事の種別を通常版に変えて保存してから、「記事を確認しました」を押してください";
  }
  return `Failed to ${operation} bill: ${error.message}`;
}
