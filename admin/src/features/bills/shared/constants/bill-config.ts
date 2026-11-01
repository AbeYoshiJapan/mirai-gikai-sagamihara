import type { BillStageGroup } from "@mirai-gikai/shared/bill-stage/labels";
import {
  BookOpen,
  CheckCircle,
  ClipboardList,
  Clock,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import type { ElementType } from "react";

// 審議状況の表示設定（一覧画面で使用）。グループは共通語彙 toBillStageGroup のもの
export const BILL_STAGE_GROUP_CONFIG: Record<
  Exclude<BillStageGroup, "all">,
  { icon: ElementType; color: string }
> = {
  waiting: {
    icon: Settings,
    color: "text-gray-600 bg-gray-50",
  },
  deliberating: {
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50",
  },
  enacted: {
    icon: CheckCircle,
    color: "text-green-600 bg-green-50",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600 bg-red-50",
  },
  // 地方議会向けの区分（議案ではなく「掲載」として扱う）
  reported: {
    icon: ClipboardList,
    color: "text-purple-600 bg-purple-50",
  },
  plan: {
    icon: BookOpen,
    color: "text-teal-600 bg-teal-50",
  },
  special_committee: {
    icon: Users,
    color: "text-indigo-600 bg-indigo-50",
  },
};
