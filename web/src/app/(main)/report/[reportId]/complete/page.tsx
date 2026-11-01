import { ReportCompletePage } from "@/features/interview-report/server/components/report-complete-page";
import { requireFeature } from "@/lib/site-settings/loader";

interface InterviewReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
}

export default async function InterviewReportPage({
  params,
}: InterviewReportPageProps) {
  await requireFeature("ai_interview");
  const { reportId } = await params;

  return <ReportCompletePage reportId={reportId} />;
}
