import type { Metadata } from "next";
import { BillsListPage } from "@/features/bills/server/components/bills-list-page";
import type { BillsListSearchParams } from "@/features/bills/shared/utils/parse-bills-list-params";
import { getSiteSettings } from "@/lib/site-settings/loader";

export async function generateMetadata(): Promise<Metadata> {
  const { site, council } = await getSiteSettings();
  return {
    title: `議案を検索する | ${site.name}`,
    description: `${council.name}に提出された議案や委員会の報告を、審議状況やカテゴリから探せます。`,
  };
}

type Props = {
  searchParams: Promise<BillsListSearchParams>;
};

export default async function BillsPage({ searchParams }: Props) {
  return <BillsListPage searchParams={await searchParams} />;
}
