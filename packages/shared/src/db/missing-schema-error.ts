/**
 * DB の更新（`supabase db push --remote`）がまだで、表や列が無いときのエラーか。
 * アプリを先にデプロイしても、既存の画面（議案の編集・タグ管理・質問の一覧など）が止まらないようにするために使う。
 * 公開サイトと管理画面の両方で使う。
 *
 * - 42P01：表が無い（PostgREST 12）／ PGRST205：表が無い（PostgREST 13 以降）
 * - 42703：select した列が無い ／ PGRST204：更新・追加しようとした列が無い
 */
const MISSING_SCHEMA_CODES = new Set([
  "42P01",
  "PGRST205",
  "42703",
  "PGRST204",
]);

export function isMissingSchemaError(
  error: { code?: string | null } | null | undefined
): boolean {
  return MISSING_SCHEMA_CODES.has(error?.code ?? "");
}
