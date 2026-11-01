import Image from "next/image";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function About() {
  const { site, operator, council } = await getSiteSettings();
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
              など公開されている一次資料をもとに整理し、運営者が内容を確認してから掲載しています。
              <br />
              なお、本サービスは{operator.title}の{operator.name}
              が、チームみらいの「みらい議会」を元に作成したものです。チームみらいが運営しているものではありません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
