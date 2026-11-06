"use client";

import { FORK_NOTICE } from "@mirai-gikai/shared/site-settings/schema";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { useSiteSettings } from "@/lib/site-settings/provider";

export function BillDisclaimer() {
  const { council, operator } = useSiteSettings();
  return (
    <div className="space-y-6 pt-4 pb-10">
      {/* データの出典について */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-black">掲載コンテンツについて</h3>
        <p className="text-xs leading-relaxed text-mirai-text-note">
          掲載されている議案情報は、{council.primary_source_label}
          など公開されている一次資料を基に、{operator.name}
          がAIを活用して下書きを作り、内容を確認したうえで整理したものです。運営者が確認していない内容は載せていません（
          <Link
            href={routes.editorialPolicy()}
            className="underline underline-offset-2 hover:opacity-80"
          >
            掲載方針
          </Link>
          ）。
          {FORK_NOTICE}。
        </p>
        <p className="text-xs leading-relaxed text-mirai-text-note">
          正確な内容は{council.name}の会議録・議案をご確認ください。
        </p>
      </div>

      {/* 掲載コンテンツについての免責事項 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-black">免責事項</h3>
        <p className="text-xs leading-relaxed text-mirai-text-note">
          本サイトで公開する情報は、可能な限り正確かつ最新の情報を反映するよう努めていますが、その正確性・完全性・即時性について保証するものではありません。正確な情報は、公式文書や一次資料をご確認ください。
        </p>
      </div>
    </div>
  );
}
