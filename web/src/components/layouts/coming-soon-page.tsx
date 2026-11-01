import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import { FORK_NOTICE } from "@mirai-gikai/shared/site-settings/schema";
import Image from "next/image";
import { getSiteSettings } from "@/lib/site-settings/loader";

/**
 * site.published が false の間に出す「準備中」ページ。
 * 管理者は /api/site-preview?token=... で合言葉 Cookie を受け取ると通常のサイトを見られる。
 */
export async function ComingSoonPage() {
  const { site, council, links, brand, operator } = await getSiteSettings();

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-mirai-surface px-6 py-16 text-center">
      <Image
        src={brandAsset(brand, "logo_url")}
        alt=""
        width={72}
        height={72}
        unoptimized
        className="mb-6"
      />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        {site.name}
      </h1>
      <p className="mt-3 text-base text-gray-700">
        {council.name}の議論をわかりやすく伝えるサイトを準備しています。
      </p>
      <p className="mt-1 text-sm text-gray-500">
        公開まで今しばらくお待ちください。
      </p>

      {links.council_site && (
        <a
          href={links.council_site}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {council.name}の公式サイトへ
        </a>
      )}

      <footer className="mt-16 space-y-1 text-xs text-gray-500">
        {operator.name && (
          <p>
            運営：{operator.name}
            {operator.title ? `（${operator.title}）` : ""}
          </p>
        )}
        <p>{FORK_NOTICE}</p>
      </footer>
    </main>
  );
}
