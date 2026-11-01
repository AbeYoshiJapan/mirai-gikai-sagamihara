"use client";

import { Badge } from "@/components/ui/badge";
import { toBillLabelOverrides } from "@/lib/site-settings/bill-labels";
import { useSiteSettings } from "@/lib/site-settings/provider";
import {
  type BillStageFields,
  getCardStatusLabel,
  getStatusVariant,
} from "../../../shared/utils/bill-status";

interface BillStatusBadgeProps {
  bill: BillStageFields;
  className?: string;
}

export function BillStatusBadge({ bill, className }: BillStatusBadgeProps) {
  const { council } = useSiteSettings();
  return (
    <Badge variant={getStatusVariant(bill)} className={className}>
      {getCardStatusLabel(bill, toBillLabelOverrides(council))}
    </Badge>
  );
}
