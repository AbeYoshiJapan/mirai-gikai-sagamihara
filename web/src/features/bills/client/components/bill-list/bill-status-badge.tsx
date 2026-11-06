"use client";

import { Badge } from "@/components/ui/badge";
import { useDeliberationTiming } from "@/lib/deliberation-timeline/provider";
import { toBillLabelOverrides } from "@/lib/site-settings/bill-labels";
import { useSiteSettings } from "@/lib/site-settings/provider";
import {
  type BillStageFields,
  getCardStatusLabel,
  getStatusVariant,
} from "../../../shared/utils/bill-status";

interface BillStatusBadgeProps {
  bill: BillStageFields & {
    submitted_date?: string | null;
    diet_session_id?: string | null;
  };
  className?: string;
}

export function BillStatusBadge({ bill, className }: BillStatusBadgeProps) {
  const { council } = useSiteSettings();
  const timing = useDeliberationTiming(bill);
  return (
    <Badge variant={getStatusVariant(bill)} className={className}>
      {getCardStatusLabel(bill, toBillLabelOverrides(council), timing)}
    </Badge>
  );
}
