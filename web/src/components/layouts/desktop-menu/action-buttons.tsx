"use client";

import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import { LinkButton } from "@/components/top/link-button";
import { routes } from "@/lib/routes";
import { useSiteSettings } from "@/lib/site-settings/provider";

/**
 * デスクトップメニュー: アクションボタン（サイドバー内）
 */
export function DesktopMenuActionButtons() {
  const { brand, operator } = useSiteSettings();
  return (
    <div className="flex flex-col gap-3">
      <LinkButton
        href={`${routes.home()}#about`}
        target="_self"
        icon={{
          src: brandAsset(brand, "logo_url"),
          alt: "",
          width: 20,
          height: 18,
        }}
      >
        このサイトについて
      </LinkButton>

      {operator.contact_url && (
        <LinkButton
          href={operator.contact_url}
          icon={{
            src: "/icons/sns/icon_web.svg",
            alt: "",
            width: 20,
            height: 20,
          }}
        >
          {operator.contact_label || "問い合わせる"}
        </LinkButton>
      )}
    </div>
  );
}
