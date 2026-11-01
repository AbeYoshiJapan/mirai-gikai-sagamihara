import { Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BillContentsEditForm } from "@/features/bills-edit/client/components/bill-contents-edit-form";
import { getBillById } from "@/features/bills-edit/server/loaders/get-bill-by-id";
import { getBillContents } from "@/features/bills-edit/server/loaders/get-bill-contents";
import { routes } from "@/lib/routes";

interface BillContentsEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillContentsEditPage({
  params,
}: BillContentsEditPageProps) {
  const { id } = await params;

  // 議案とコンテンツを並行取得
  const [billResult, billContents] = await Promise.all([
    getBillById(id),
    getBillContents(id),
  ]);

  if (!billResult) {
    throw new Error("議案が見つかりません");
  }

  const bill = billResult;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">議案コンテンツ編集</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.billGenerate(id) as Route}>
            <Sparkles className="mr-1 h-4 w-4" />
            AI で解説を生成
          </Link>
        </Button>
      </div>
      <BillContentsEditForm bill={bill} billContents={billContents} />
    </div>
  );
}
