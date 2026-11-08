import { renderSiteNameNote } from "@mirai-gikai/shared/site-settings/public";
import Image from "next/image";
import Link from "next/link";
import { parseMarkdown } from "@/lib/markdown";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function About() {
  const settings = await getSiteSettings();
  const { site, council } = settings;
  // サイト名の由来・込めた思い（サイト設定「サイト名について」。空なら出さない）
  const nameNote = renderSiteNameNote(settings);
  const nameNoteContent = nameNote ? await parseMarkdown(nameNote) : null;
  return (
    <div id="about" className="scroll-mt-24 py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            {site.name}とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              {council.name}での議論を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              {site.name}は、{council.name}
              で今どんな議案が審議されているかを、わかりやすく伝えるサイトです。
              {council.primary_source_label}
              など公開されている一次資料をもとに整理し、運営者が内容を確認してから掲載しています。AI
              の下書きや自動で集めた情報を、運営者の確認なしに載せることはありません（
              <Link
                href={routes.editorialPolicy()}
                className="font-bold text-primary underline underline-offset-2"
              >
                掲載方針
              </Link>
              ）。
              <br />
              なお、本サービスは運営者が、チームみらいの「みらい議会」を元に作成したものです。チームみらいが運営しているものではありません。
            </p>
          </div>

          {nameNoteContent && (
            <section className="flex flex-col gap-2 rounded-2xl bg-white px-5 py-4">
              <h4 className="text-sm font-bold text-primary-accent">
                サイト名について
              </h4>
              <div className="markdown-content text-[15px] leading-[28px] text-black [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-3 [&_p:last-child]:mb-0">
                {nameNoteContent}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
