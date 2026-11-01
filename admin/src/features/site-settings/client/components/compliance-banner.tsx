import type { ComplianceIssue } from "@mirai-gikai/shared/site-settings/compliance";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface ComplianceBannerProps {
  issues: ComplianceIssue[];
  /** タブのリンクを出すか（ウィザードでは出さない） */
  onSelectSection?: (section: ComplianceIssue["section"]) => void;
}

/**
 * フォークガイドライン・AGPL の点検結果。
 */
export function ComplianceBanner({
  issues,
  onSelectSection,
}: ComplianceBannerProps) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        フォークガイドラインと AGPL の必須項目はそろっています。
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-900">
        公開前に確認が必要な項目があります
      </p>
      <ul className="space-y-1">
        {issues.map((issue) => (
          <li
            key={`${issue.section}:${issue.message}`}
            className="flex items-start gap-2 text-sm"
          >
            {issue.level === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <span className="text-gray-800">{issue.message}</span>
            {onSelectSection && (
              <button
                type="button"
                onClick={() => onSelectSection(issue.section)}
                className="ml-auto shrink-0 text-xs text-blue-700 underline"
              >
                設定へ
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
