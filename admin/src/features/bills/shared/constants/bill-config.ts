import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import type { ElementType } from "react";

import type { BillStatus } from "../types";

// ステータスの表示設定（一覧画面で使用）
export const BILL_STATUS_CONFIG: Record<
  BillStatus,
  { icon: ElementType; color: string }
> = {
  preparing: {
    icon: Settings,
    color: "text-gray-600 bg-gray-50",
  },
  introduced: {
    icon: FileText,
    color: "text-blue-600 bg-blue-50",
  },
  in_originating_house: {
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50",
  },
  in_receiving_house: {
    icon: AlertCircle,
    color: "text-orange-600 bg-orange-50",
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
