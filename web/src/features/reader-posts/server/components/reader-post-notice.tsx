import Link from "next/link";
import { routes } from "@/lib/routes";

/**
 * 意見・質問フォームの下に出す注意書き。
 * このサイトへの投稿は議会への正式な意思表示ではないことを示し、請願・陳情の案内へ誘導する。
 */
export function ReaderPostNotice({ councilName }: { councilName: string }) {
  return (
    <p className="text-xs leading-[1.7] text-mirai-text-subtle">
      このフォームの投稿は、このサイトの運営者に届きます。{councilName}
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
