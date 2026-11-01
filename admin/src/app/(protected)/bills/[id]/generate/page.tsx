import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerationPanel } from "@/features/bill-generation/client/components/generation-panel";
import {
  loadGenerationJobs,
  loadMonthlyGenerationCost,
} from "@/features/bill-generation/server/loaders/load-generation-jobs";
import { getBillSources } from "@/features/bill-sources/server/loaders/get-bill-sources";
import { getBillById } from "@/features/bills-edit/server/loaders/get-bill-by-id";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { routes } from "@/lib/routes";

/** 生成は 1〜2 分かかることがある（Server Action の実行時間上限） */
export const maxDuration = 300;

interface GeneratePageProps {
  params: Promise<{ id: string }>;
}

export default async function BillGeneratePage({ params }: GeneratePageProps) {
  const { id } = await params;
  const [bill, sources, jobs, monthCostUsd, { settings }] = await Promise.all([
    getBillById(id),
    getBillSources(id),
    loadGenerationJobs(id),
    loadMonthlyGenerationCost(),
    loadSiteSettings(),
  ]);

  if (!bill) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-6">
        <Link
          href={routes.billEdit(bill.id) as Route}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          議案の基本情報に戻る
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI で解説を生成</h1>
        <p className="mt-1 text-gray-600">{bill.name}</p>
      </div>
      <GenerationPanel
        bill={{
          id: bill.id,
          name: bill.name,
          knowledge_source: bill.knowledge_source,
        }}
        sources={sources}
        jobs={jobs}
        model={settings.ai.generation_model}
        monthCostUsd={monthCostUsd}
        monthLimitUsd={settings.ai.monthly_total_usd_limit}
        initialJobId={jobs[0]?.id ?? null}
      />
    </div>
  );
}
