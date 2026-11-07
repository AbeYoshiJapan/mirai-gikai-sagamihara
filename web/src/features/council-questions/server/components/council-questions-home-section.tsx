import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import {
  getPublicThemes,
  getQuestionMeetings,
} from "../loaders/council-question-loaders";

/** トップの「議会での質問」。いちばん新しい定例会議への入口だけを出す */
export async function CouncilQuestionsHomeSection() {
  const [{ council }, meetings, themes] = await Promise.all([
    getSiteSettings(),
    getQuestionMeetings(),
    getPublicThemes(),
  ]);
  const latest = meetings[0];
  if (!latest) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold leading-[1.48] text-black">
          議会での質問
        </h2>
        <p className="text-xs text-mirai-text-secondary">
          {council.name}
          の本会議で、だれが何を取り上げるのかを、議会が公表する通告一覧のとおりに載せています（運営者が確認して載せています）
        </p>
      </div>
      <Link
        href={routes.councilQuestionMeeting(latest.meeting_key) as Route}
        className="block rounded-2xl bg-white px-5 py-4 hover:bg-mirai-surface-light"
      >
        <div className="text-lg font-bold">{latest.meeting_name}</div>
        <p className="mt-1 text-sm text-mirai-text-secondary">
          代表質問・個人質疑・一般質問　{latest.count} 件
        </p>
      </Link>
      <div className="flex flex-col items-end gap-2">
        <Link
          href={routes.councilQuestions() as Route}
          className="text-sm font-bold text-primary underline underline-offset-2"
        >
          議会での質問をすべて見る
        </Link>
        {themes.length > 0 && (
          <Link
            href={routes.themes() as Route}
            className="text-sm font-bold text-primary underline underline-offset-2"
          >
            テーマから見る
          </Link>
        )}
      </div>
    </section>
  );
}
