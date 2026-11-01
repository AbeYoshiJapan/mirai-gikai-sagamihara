import type { BillVotes, VoteValue } from "../../../shared/types";

interface BillVotesSectionProps {
  votes: BillVotes;
  showFactions: boolean;
  showMembers: boolean;
}

const VOTE_LABELS: Record<VoteValue, string> = {
  for: "賛成",
  against: "反対",
  abstain: "棄権",
  absent: "欠席",
  chair: "議長（採決に加わらず）",
};

const VOTE_ORDER: VoteValue[] = [
  "for",
  "against",
  "abstain",
  "absent",
  "chair",
];

const VOTE_STYLES: Record<VoteValue, string> = {
  for: "bg-green-50 text-green-800 border-green-200",
  against: "bg-red-50 text-red-800 border-red-200",
  abstain: "bg-gray-50 text-gray-700 border-gray-200",
  absent: "bg-gray-50 text-gray-500 border-gray-200",
  chair: "bg-gray-50 text-gray-500 border-gray-200",
};

/**
 * 議案詳細の「賛否」。会派ごと・議員ごとの賛否を、機能フラグに応じて出す。
 * データは管理画面で入れた vote_records（出典は議会の審議結果）。
 */
export function BillVotesSection({
  votes,
  showFactions,
  showMembers,
}: BillVotesSectionProps) {
  const factions = showFactions ? votes.factions : [];
  const members = showMembers ? votes.members : [];
  if (factions.length === 0 && members.length === 0) return null;

  return (
    <section aria-labelledby="bill-votes-heading" className="space-y-4">
      <h2
        id="bill-votes-heading"
        className="text-[22px] font-bold leading-[1.636]"
      >
        🗳️ 賛否
      </h2>

      {factions.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 text-xs font-bold text-mirai-text-note border-b">
            会派ごと
          </div>
          <ul className="divide-y">
            {factions.map(({ faction, vote, note }) => (
              <li
                key={faction.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <span className="text-sm text-black">{faction.name}</span>
                <span className="flex items-center gap-2">
                  {note && (
                    <span className="text-xs text-mirai-text-note">{note}</span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${VOTE_STYLES[vote]}`}
                  >
                    {VOTE_LABELS[vote]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {members.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2 text-xs font-bold text-mirai-text-note border-b">
            議員ごと
          </div>
          <div className="divide-y">
            {VOTE_ORDER.map((vote) => {
              const names = members.filter((m) => m.vote === vote);
              if (names.length === 0) return null;
              return (
                <div key={vote} className="px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${VOTE_STYLES[vote]}`}
                    >
                      {VOTE_LABELS[vote]}
                    </span>
                    <span className="text-xs text-mirai-text-note">
                      {names.length}人
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-black">
                    {names
                      .map(({ member }) =>
                        member.faction_name
                          ? `${member.name}（${member.faction_name}）`
                          : member.name
                      )
                      .join("、")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
