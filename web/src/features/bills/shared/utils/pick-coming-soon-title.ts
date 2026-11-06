type ContentTitle = { title: string; difficulty_level: string };

/**
 * 「これから掲載される議案」に出す見出しを決める。
 *
 * 解説の見出し（bill_contents.title）は AI の下書きから作られることがあるため、
 * 運営者が記事の確認を済ませた議案（is_review_completed）に限って使う。
 * 確認前は null を返し、呼び出し側で議会が付けた正式名称（name）だけを出す。
 *
 * 見出しは利用者が選んだ難易度のものを優先し、なければ「ふつう」、それもなければ
 * 最初に見つかったものを使う。
 */
export function pickComingSoonTitle(
  contents: ContentTitle[] | null | undefined,
  difficultyLevel: string,
  isReviewCompleted: boolean
): string | null {
  if (!isReviewCompleted) return null;

  const preferred = contents?.find(
    (c) => c.difficulty_level === difficultyLevel
  );
  const fallback =
    contents?.find((c) => c.difficulty_level === "normal") ?? contents?.[0];

  return preferred?.title || fallback?.title || null;
}
