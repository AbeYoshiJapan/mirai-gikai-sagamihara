import { CouncilQuestionsPage } from "@/features/council-questions/server/components/council-questions-page";

/** 通告一覧の PDF（3 本）を読むのに数十秒かかることがある */
export const maxDuration = 120;

export default function CouncilQuestionsRoute() {
  return <CouncilQuestionsPage />;
}
