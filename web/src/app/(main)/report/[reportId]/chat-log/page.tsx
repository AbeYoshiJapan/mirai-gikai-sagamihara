import type { Route } from "next";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireFeature } from "@/lib/site-settings/loader";

interface ChatLogPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
}

export default async function ChatLogPage({
  params,
  searchParams,
}: ChatLogPageProps) {
  await requireFeature("ai_interview");
  const { reportId } = await params;
  const { from } = await searchParams;

  const reportPath =
    from === "complete"
      ? routes.reportComplete(reportId)
      : routes.publicReport(reportId);
  const search = from === "opinions" ? "?from=opinions" : "";

  redirect(`${reportPath}${search}#chat-log` as Route);
}
