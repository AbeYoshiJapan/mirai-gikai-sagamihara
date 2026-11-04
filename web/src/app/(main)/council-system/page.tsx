import {
  councilWording,
  hasSessionSystemPage,
  renderSessionSystemText,
} from "@mirai-gikai/shared/site-settings/public";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalPageLayout } from "@/components/layouts/legal-page-layout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PeriodList } from "@/features/council-meetings/server/components/period-list";
import { loadCouncilSchedule } from "@/features/council-meetings/server/loaders/load-council-schedule";
import { formatCouncilYear } from "@/features/council-meetings/shared/utils/council-period";
import { parseMarkdown } from "@/lib/markdown";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { getJapanTime } from "@/lib/utils/date";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  if (!hasSessionSystemPage(council)) return {};
  return {
    title: `${council.session_system_label}とは | ${site.name}`,
    description:
      council.session_system_summary ||
      `${council.name}の会期の制度（${council.session_system_label}）の説明`,
  };
}

/**
 * 会期の制度（通年議会など）の説明ページ。
 *
 * 相模原市議会は 1 年を 1 会期とする通年議会で、その中の定例会議を単位に運営している。
 * 制度の説明（Markdown）と、今年度の定例会議の一覧・開会までの日数を出す。
 * 文言はサイト設定（議会タブ）で変えられ、制度名が空なら 404。
 */
export default async function CouncilSystemPage() {
  const settings = await getSiteSettings();
  const { council, links, features } = settings;
  if (!hasSessionSystemPage(council)) {
    notFound();
  }

  const title = `${council.session_system_label}とは`;
  const wording = councilWording(council);
  const sessionLabel = wording.sessionLabel;
  const [content, schedule] = await Promise.all([
    parseMarkdown(renderSessionSystemText(settings)),
    loadCouncilSchedule(getJapanTime()),
  ]);
  const { periods, today, status } = schedule;

  return (
    <LegalPageLayout
      title={title}
      enLabel="How the Council Sits"
      description={council.session_system_summary || undefined}
      className="pt-24 md:pt-12"
    >
      <div className="space-y-10">
        <div className="-mt-4">
          <Breadcrumb
            items={[{ label: "トップ", href: routes.home() }, { label: title }]}
          />
        </div>

        {periods.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-wider">
              {formatCouncilYear(status.councilYear)}の{sessionLabel}
            </h2>
            <PeriodList
              periods={periods}
              today={today}
              countdownOpenLabel={wording.countdownOpen}
              countdownCloseLabel={wording.countdownClose}
            />
            <p className="text-xs leading-5 text-mirai-text-secondary">
              期間は運営者が{council.name}
              の案内をもとに登録しています。正確な日程は{council.name}
              の公式サイトでご確認ください。
            </p>
          </section>
        )}

        {content && (
          <div
            className="
              markdown-content max-w-none text-[15px] leading-loose tracking-wide
              [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-wider
              [&_h2:first-child]:mt-0
              [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold
              [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
              [&_li]:mb-2
              [&_a]:!underline [&_a]:!underline-offset-[3px]
              [&_a:hover]:opacity-70
            "
          >
            {content}
          </div>
        )}

        <section className="space-y-2 border-t border-neutral-200 pt-6 text-sm">
          <h2 className="text-base font-bold">あわせて見る</h2>
          <ul className="flex flex-col gap-1.5">
            {features.schedule && (
              <li>
                <Link
                  href={routes.schedule()}
                  className="font-bold text-primary underline underline-offset-2"
                >
                  会議の予定
                </Link>
              </li>
            )}
            {links.schedule_page && (
              <li>
                <a
                  href={links.schedule_page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary underline underline-offset-2"
                >
                  {council.name}の会議日程（公式サイト）
                </a>
              </li>
            )}
            {links.council_site && (
              <li>
                <a
                  href={links.council_site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary underline underline-offset-2"
                >
                  {council.name}の公式サイト
                </a>
              </li>
            )}
          </ul>
        </section>
      </div>
    </LegalPageLayout>
  );
}
