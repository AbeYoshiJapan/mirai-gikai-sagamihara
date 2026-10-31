import Image from "next/image";
import { LinkButton } from "./link-button";

/**
 * 運営者の公式サイトとSNS。URLは gorisan.tech のフッター設定（原稿/発信/サイト/サイト設定/）による。
 * url が空のものは表示しない。
 */
const OPERATOR_SNS = [
  {
    name: "公式サイト",
    url: "https://www.gorisan.tech/",
    iconPath: "/icons/sns/icon_web.svg",
  },
  {
    name: "X",
    url: "https://x.com/gorisan_it",
    iconPath: "/icons/sns/icon_x.png",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/h.inoue1209/",
    iconPath: "/icons/sns/icon_instagram.png",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/channel/UCAvOPiTGcJxOAWzSgNJhAeg",
    iconPath: "/icons/sns/icon_youtube.png",
  },
  {
    name: "LINE",
    url: "https://lin.ee/HaHeS7R",
    iconPath: "/icons/sns/icon_line.png",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@h.inoue1209",
    iconPath: "/icons/sns/icon_tiktok.png",
  },
] as const;

/** 運営者（墨田区議会議員）の紹介。肩書き・所属は令和8年10月6日現在の名簿による。 */
export function Operator() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-6">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-black tracking-wide text-primary-accent leading-none">
            Operator
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            このサイトの運営者
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Image
              src="/img/operator.png"
              alt="井上ひろきの写真"
              width={96}
              height={96}
              className="rounded-full flex-shrink-0"
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-primary-accent">
                墨田区議会議員
              </p>
              <p className="text-2xl font-bold">井上ひろき</p>
              <p className="text-sm text-black">
                ITゴリさん／AI時代のITエンジニア議員
              </p>
            </div>
          </div>

          <p className="text-[15px] leading-[28px] text-black">
            ソフトウェア開発の現場でエンジニアとして働き、システム開発会社を起業。2023年から墨田区議会議員（1期目）。
            「寄り添う デジタル推進で
            区民に幸せを。」を掲げ、ITに関わる予算の適正化や、スマートフォンやインターネットが身近ではない方へのサポートに取り組んでいます。
          </p>

          <ul className="text-sm leading-[24px] text-black list-disc pl-5">
            <li>会派：墨田区議会自由民主党</li>
            <li>子ども文教委員会 副委員長／議会改革特別委員会 委員</li>
          </ul>

          <p className="text-sm leading-[24px] text-black">
            このサイトは議員個人が運営しています。墨田区議会・墨田区の公式サイトではありません。ご意見や不具合のご連絡は、議会事務局や区役所ではなく、下のLINE公式アカウントからお寄せください。
          </p>

          {/* ボタングループ */}
          <div className="flex flex-col gap-4">
            <LinkButton
              href="https://lin.ee/HaHeS7R"
              icon={{
                src: "/icons/sns/icon_line.png",
                alt: "",
                width: 22,
                height: 22,
              }}
            >
              LINE公式アカウントで問い合わせる
            </LinkButton>
          </div>

          {/* SNSアイコン */}
          <div className="flex flex-wrap gap-3 items-end">
            {OPERATOR_SNS.filter((sns) => sns.url).map((sns) => (
              <a
                key={sns.name}
                href={sns.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                <Image
                  src={sns.iconPath}
                  alt={sns.name}
                  width={48}
                  height={48}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
