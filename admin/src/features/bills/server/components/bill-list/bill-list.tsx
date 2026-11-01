import { toBillStageGroup } from "@mirai-gikai/shared/bill-stage/labels";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";
import { BillActionsMenu } from "../../../client/components/bill-actions-menu/bill-actions-menu";
import { PreviewButton } from "../../../client/components/bill-list/preview-button";
import { PublishStatusBadge } from "../../../client/components/bill-list/publish-status-badge";
import { ViewButton } from "../../../client/components/bill-list/view-button";
import { BILL_STAGE_GROUP_CONFIG } from "../../../shared/constants/bill-config";
import type {
  BillSortConfig,
  BillWithDietSession,
} from "../../../shared/types";
import { getBillStageLabel } from "../../../shared/types";
import { summarizeReviewQueue } from "../../../shared/utils/review-queue";
import { getBills } from "../../loaders/get-bills";

function StageBadge({ bill }: { bill: BillWithDietSession }) {
  const group = toBillStageGroup(bill);
  const config = BILL_STAGE_GROUP_CONFIG[group];
  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-1.5 py-1 rounded-full text-sm font-bold">
      <Icon className="h-4 w-4" />
      <span>{getBillStageLabel(bill)}</span>
    </div>
  );
}

function ReviewQueueSummary({ bills }: { bills: BillWithDietSession[] }) {
  const summary = summarizeReviewQueue(bills);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
      <span>{bills.length}件の議案</span>
      <span>公開中 {summary.published}</span>
      <span className={summary.awaitingReview > 0 ? "text-amber-700" : ""}>
        未確認の下書き {summary.awaitingReview}
      </span>
      <span>確認済み・未公開 {summary.reviewedUnpublished}</span>
    </div>
  );
}

export async function BillList({ sortConfig }: { sortConfig: BillSortConfig }) {
  const bills = await getBills(sortConfig);

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <ReviewQueueSummary bills={bills} />
        <Link href={routes.billNew()}>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>議案名</TableHead>
              <TableHead>会期</TableHead>
              <SortableTableHead
                field="publish_status_order"
                currentField={sortConfig.field}
                currentOrder={sortConfig.order}
              >
                公開ステータス
              </SortableTableHead>
              <SortableTableHead
                field="status_order"
                currentField={sortConfig.field}
                currentOrder={sortConfig.order}
              >
                審議ステータス
              </SortableTableHead>
              <SortableTableHead
                field="submitted_date"
                currentField={sortConfig.field}
                currentOrder={sortConfig.order}
              >
                法案提出日
              </SortableTableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BillRow({ bill }: { bill: BillWithDietSession }) {
  return (
    <TableRow>
      <TableCell className="max-w-[400px]">
        <Link
          href={routes.billEdit(bill.id) as Route}
          className="block truncate font-medium hover:underline"
        >
          {bill.name}
        </Link>
      </TableCell>
      <TableCell className="text-gray-600">
        {bill.diet_sessions?.name ?? "-"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <PublishStatusBadge
            billId={bill.id}
            publishStatus={bill.publish_status}
            gate={{
              is_review_completed: bill.is_review_completed,
              article_kind: bill.article_kind,
            }}
          />
          {(bill.publish_status === "draft" ||
            bill.publish_status === "coming_soon") && (
            <PreviewButton billId={bill.id} />
          )}
          {bill.publish_status === "published" && (
            <ViewButton billId={bill.id} />
          )}
        </div>
      </TableCell>
      <TableCell>
        <StageBadge bill={bill} />
      </TableCell>
      <TableCell className="text-gray-600">
        {bill.submitted_date
          ? new Date(bill.submitted_date).toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })
          : "-"}
      </TableCell>
      <TableCell>
        <BillActionsMenu billId={bill.id} billName={bill.name} />
      </TableCell>
    </TableRow>
  );
}
