import { renderOperatorDisclaimer } from "@mirai-gikai/shared/site-settings/public";
import Image from "next/image";
import { getSiteSettings } from "@/lib/site-settings/loader";
import { LinkButton } from "./link-button";

/** SNS 名 → /icons/sns/ のファイル。知らない名前は汎用の Web アイコン */
const SNS_ICON_FILES: Record<string, string> = {
  web: "icon_web.svg",
  x: "icon_x.png",
  twitter: "icon_x.png",
  instagram: "icon_instagram.png",
  youtube: "icon_youtube.png",
  line: "icon_line.png",
  tiktok: "icon_tiktok.png",
  facebook: "icon_facebook.png",
  note: "icon_note.png",
  threads: "icon_threads.png",
};

export function snsIconPath(icon: string): string {
  const file = SNS_ICON_FILES[icon.trim().toLowerCase()] ?? "icon_web.svg";
  return `/icons/sns/${file}`;
}

/**
 * 運営者の紹介。内容はすべてサイト設定（運営者タブ）から。
 * 機能フラグ operator_section が false のときは呼び出し側で出さない。
 */
export async function Operator() {
  const settings = await getSiteSettings();
  const { operator } = settings;
  const disclaimer = renderOperatorDisclaimer(settings);
  const snsLinks = [
    ...(operator.official_site
      ? [{ name: "公式サイト", url: operator.official_site, icon: "web" }]
      : []),
    ...operator.sns.filter((sns) => sns.url),
  ];

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
            {operator.photo_url ? (
              <Image
                src={operator.photo_url}
                alt={`${operator.name}の写真`}
                width={96}
                height={96}
                className="rounded-full flex-shrink-0 object-cover"
                unoptimized
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-mirai-gradient text-2xl font-bold text-primary-accent"
              >
                {operator.name.slice(0, 1)}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-primary-accent">
                {operator.title}
                {operator.ward ? `（${operator.ward}）` : ""}
              </p>
              <p className="text-2xl font-bold">{operator.name}</p>
              {operator.catchphrase && (
                <p className="text-sm text-black">{operator.catchphrase}</p>
              )}
            </div>
          </div>

          {operator.bio_md && (
            <p className="text-[15px] leading-[28px] text-black whitespace-pre-line">
              {operator.bio_md}
            </p>
          )}

          {(operator.faction || operator.affiliations.length > 0) && (
            <ul className="text-sm leading-[24px] text-black list-disc pl-5">
              {operator.faction && <li>会派：{operator.faction}</li>}
              {operator.affiliations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <p className="text-sm leading-[24px] text-black whitespace-pre-line">
            {disclaimer}
          </p>

          {operator.contact_url && (
            <div className="flex flex-col gap-4">
              <LinkButton
                href={operator.contact_url}
                icon={{
                  src: "/icons/sns/icon_web.svg",
                  alt: "",
                  width: 22,
                  height: 22,
                }}
              >
                {operator.contact_label || "問い合わせる"}
              </LinkButton>
            </div>
          )}

          {snsLinks.length > 0 && (
            <div className="flex flex-wrap gap-3 items-end">
              {snsLinks.map((sns) => (
                <a
                  key={`${sns.name}-${sns.url}`}
                  href={sns.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <Image
                    src={snsIconPath(sns.icon)}
                    alt={sns.name}
                    width={48}
                    height={48}
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
