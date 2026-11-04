import { parseMeetingPeriods } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import { brandAsset } from "@mirai-gikai/shared/site-settings/public";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { getBillsByDietSession } from "@/features/bills/server/loaders/get-bills-by-diet-session";
import { getCouncilMeetings } from "@/features/council-meetings/server/loaders/get-council-meetings";
import { resolveCouncilPeriods } from "@/features/council-meetings/shared/utils/council-period";
import { DietSessionBillList } from "@/features/diet-sessions/client/components/diet-session-bill-list";
import { getDietSessionBySlug } from "@/features/diet-sessions/server/loaders/get-diet-session-by-slug";
import { routes } from "@/lib/routes";
import { getSiteSettings } from "@/lib/site-settings/loader";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const session = await getDietSessionBySlug(slug);

  if (!session) {
    return { title: "会期が見つかりません" };
  }

  const { site } = await getSiteSettings();
  return {
    title: `${session.name}の議案一覧 | ${site.name}`,
    description: `${session.name}（${session.start_date}〜${session.end_date}）の議案・委員会報告・特別委員会の調査の一覧です。`,
  };
}

export default async function DietSessionBillsPage({ params }: Props) {
  const { slug } = await params;
  const session = await getDietSessionBySlug(slug);

  if (!session) {
    notFound();
  }

  // 会期は議会年度（5月始まり）なので、開始年がそのまま議会年度になる
  const councilYear = Number(session.start_date.slice(0, 4));
  const [bills, meetings] = await Promise.all([
    getBillsByDietSession(session.id),
    getCouncilMeetings(councilYear),
  ]);
  // 会期管理で入力した定例会議などの期間を優先し、無ければ会議予定の本会議名から導く
  const periods = resolveCouncilPeriods(
    parseMeetingPeriods(session.meeting_periods),
    meetings
  );
  const { brand } = await getSiteSettings();

  return (
    <div className="bg-mirai-surface-muted">
      {/* ヒーロー画像 */}
      <div className="relative w-full h-[285px]">
        <Image
          src={brandAsset(brand, "archive_hero_url")}
          alt={`${session.name}の議案一覧`}
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={85}
        />
      </div>

      <Container className="py-8">
        <DietSessionBillList
          session={session}
          bills={bills}
          periods={periods}
        />
      </Container>

      {/* パンくずリスト */}
      <Container className="py-8">
        <nav className="flex items-center gap-2 text-[15px]">
          <Link href={routes.home()} className="text-black">
            TOP
          </Link>
          <ChevronRight className="h-5 w-5 text-black" />
          <span className="text-black">{session.name}</span>
        </nav>
      </Container>
    </div>
  );
}
