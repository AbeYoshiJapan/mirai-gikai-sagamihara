import { DietSessionItem } from "../../client/components/diet-session-item";
import type { DietSession } from "../../shared/types";

type DietSessionListProps = {
  sessions: DietSession[];
  /** 会議期間の呼び方（例: 定例会議） */
  sessionLabel?: string;
};

export function DietSessionList({
  sessions,
  sessionLabel,
}: DietSessionListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">会期一覧 ({sessions.length}件)</h2>

      {sessions.length === 0 ? (
        <p className="text-gray-500">会期がありません</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <DietSessionItem
              key={session.id}
              session={session}
              sessionLabel={sessionLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
