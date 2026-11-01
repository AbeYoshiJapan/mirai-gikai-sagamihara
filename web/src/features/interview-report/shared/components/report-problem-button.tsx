"use client";

import Image from "next/image";
import { useSiteSettings } from "@/lib/site-settings/provider";

export function ReportProblemButton() {
  const { operator } = useSiteSettings();
  if (!operator.contact_url) return null;
  return (
    <a
      href={operator.contact_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 py-2 text-base font-bold"
    >
      <Image
        src="/icons/report-error.svg"
        alt="報告アイコン"
        width={20}
        height={20}
        className="shrink-0"
      />
      誤りを報告する
    </a>
  );
}
