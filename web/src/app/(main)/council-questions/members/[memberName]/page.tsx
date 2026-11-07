import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberQuestionsPage } from "@/features/council-questions/server/components/member-questions-page";
import { getSiteSettings, requireFeature } from "@/lib/site-settings/loader";

function decodeName(raw: string): string | null {
  try {
    const name = decodeURIComponent(raw).trim();
    return name && name.length <= 60 ? name : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ memberName: string }>;
}): Promise<Metadata> {
  const { memberName } = await params;
  const { site } = await getSiteSettings();
  const name = decodeName(memberName);
  return { title: `${name ?? ""}議員の議会での質問 | ${site.name}` };
}

export default async function MemberQuestionsRoute({
  params,
}: {
  params: Promise<{ memberName: string }>;
}) {
  await requireFeature("council_questions");
  const name = decodeName((await params).memberName);
  if (!name) notFound();
  return <MemberQuestionsPage memberName={name} />;
}
