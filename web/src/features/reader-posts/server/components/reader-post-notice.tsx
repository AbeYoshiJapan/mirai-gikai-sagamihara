import Link from "next/link";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { buildPostRecipientNotice } from "../../shared/utils/post-recipient-notice";

/**
 * 意見・質問フォームの下に出す注意書き。
 * 投稿の送り先と対応者（運営者）を示し、議会への正式な意思表示ではないことと、請願・陳情の案内へ誘導する。
 */
export async function ReaderPostNotice({
  councilName,
}: {
  councilName: string;
}) {
  const { operator } = await getSiteSettings();
  return (
    <p className="text-xs leading-[1.7] text-mirai-text-subtle">
      {buildPostRecipientNotice(operator.name)}
      {councilName}
      への正式な意思表示（請願・陳情）にはなりません。正式に届ける方法は
      <Link
        href={routes.petitionGuide()}
        className="mx-0.5 text-primary-accent underline"
      >
        議会に正式に届けるには
      </Link>
      をご覧ください。個人情報は書かないでください。
    </p>
  );
}
