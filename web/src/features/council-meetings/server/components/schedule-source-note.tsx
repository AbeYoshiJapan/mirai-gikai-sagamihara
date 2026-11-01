import { getSiteSettings } from "@/lib/site-settings/loader";

/** 出典と「予定は変わる」注意書き。議会サイトの文言に合わせる。 */
export async function ScheduleSourceNote({ sourceUrl }: { sourceUrl: string }) {
  const { council } = await getSiteSettings();
  return (
    <p className="text-right text-xs leading-5 text-mirai-text-secondary">
      出典：
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        {council.name}「会議日程」
      </a>
      <br />
      日程は予定であり、変更になる場合があります。最新の情報は{council.name}
      のページでご確認ください。
    </p>
  );
}
