import type { ReactNode } from "react";
import { PublishGate } from "@/components/layouts/publish-gate";
import { SiteChrome } from "@/components/layouts/site-chrome";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <PublishGate>
      <SiteChrome>{children}</SiteChrome>
    </PublishGate>
  );
}
