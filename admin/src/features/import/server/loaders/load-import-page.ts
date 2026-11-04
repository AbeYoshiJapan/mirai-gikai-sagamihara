import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { loadDietSessions } from "@/features/diet-sessions/server/loaders/load-diet-sessions";
import { findRecentImportRuns } from "../repositories/import-repository";

export async function loadImportPage() {
  noStore();
  const [sessions, runs] = await Promise.all([
    loadDietSessions(),
    findRecentImportRuns(20),
  ]);
  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      is_active: s.is_active,
    })),
    runs,
  };
}
