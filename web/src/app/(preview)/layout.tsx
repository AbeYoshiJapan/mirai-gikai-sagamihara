import type { ReactNode } from "react";
import { SiteChrome } from "@/components/layouts/site-chrome";

/**
 * 管理者向けプレビュー（/preview 配下）。
 * トークンで認証するので、公開前（site.published=false）でも「準備中」にしない。
 */
export default function PreviewGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <SiteChrome>{children}</SiteChrome>;
}
