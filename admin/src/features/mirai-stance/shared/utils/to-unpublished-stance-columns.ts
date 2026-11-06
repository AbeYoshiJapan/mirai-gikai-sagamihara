import type { StanceInput } from "../types";
import { toStanceColumns } from "./to-stance-columns";

/**
 * AI エージェント（MCP）からの書き込み用のカラム。賛否は必ず非公開で保存する。
 *
 * 公開は、運営者が管理画面で内容を確かめてから行う（掲載方針）。公開中の賛否を
 * 書き換えた場合も非公開に戻るので、確認前の内容が公開サイトに出ることはない。
 * 公開日時・公開確認日は指定どおり保存する（運営者が公開にしたときに使われる）。
 */
export function toUnpublishedStanceColumns(input: StanceInput) {
  return {
    ...toStanceColumns({ ...input, isPublished: undefined }),
    is_published: false,
  };
}
