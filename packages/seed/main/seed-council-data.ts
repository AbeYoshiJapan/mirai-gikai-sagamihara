import type { AdminClient } from "../shared/helper";
import {
  billSources,
  committeeNameForBill,
  committees,
  councilMeetings,
  factionVotes,
  factions,
  memberVotes,
  members,
  readerOpinions,
  readerQuestions,
} from "./council-data";
import { bills } from "./data";

/**
 * 委員会・会派・議員・賛否・一次資料・会議予定を入れる。
 * 議案との紐づけは議案名で行う（data.ts の bills と council-data.ts の名前を合わせること）。
 */
export async function seedCouncilData(
  supabase: AdminClient,
  insertedBills: { id: string; name: string }[]
): Promise<void> {
  console.log("🏛️  Inserting committees...");
  const { data: insertedCommittees, error: committeesError } = await supabase
    .from("committees")
    .insert(committees)
    .select("id, name");
  if (committeesError) {
    throw new Error(`Failed to insert committees: ${committeesError.message}`);
  }
  const committeeIdByName = new Map(
    (insertedCommittees ?? []).map((c) => [c.name, c.id])
  );

  // 付託先
  let referred = 0;
  for (const bill of insertedBills) {
    const source = bills.find((b) => b.name === bill.name);
    const committeeName = committeeNameForBill({
      name: bill.name,
      bill_kind: source?.bill_kind ?? null,
    });
    const committeeId = committeeName
      ? committeeIdByName.get(committeeName)
      : null;
    if (!committeeId) continue;
    const { error } = await supabase
      .from("bills")
      .update({ committee_id: committeeId })
      .eq("id", bill.id);
    if (error) {
      throw new Error(`Failed to set committee: ${error.message}`);
    }
    referred += 1;
  }
  console.log(
    `✅ Inserted ${insertedCommittees?.length ?? 0} committees, referred ${referred} bills`
  );

  console.log("👥 Inserting factions and members...");
  const { data: insertedFactions, error: factionsError } = await supabase
    .from("factions")
    .insert(factions)
    .select("id, name");
  if (factionsError) {
    throw new Error(`Failed to insert factions: ${factionsError.message}`);
  }
  const factionIdByName = new Map(
    (insertedFactions ?? []).map((f) => [f.name, f.id])
  );

  const { data: insertedMembers, error: membersError } = await supabase
    .from("members")
    .insert(
      members.map(({ faction_name, ...member }) => ({
        ...member,
        faction_id: factionIdByName.get(faction_name) ?? null,
      }))
    )
    .select("id, name");
  if (membersError) {
    throw new Error(`Failed to insert members: ${membersError.message}`);
  }
  const memberIdByName = new Map(
    (insertedMembers ?? []).map((m) => [m.name, m.id])
  );
  console.log(
    `✅ Inserted ${insertedFactions?.length ?? 0} factions, ${insertedMembers?.length ?? 0} members`
  );

  console.log("🗳️  Inserting vote records...");
  const billIdByName = new Map(insertedBills.map((b) => [b.name, b.id]));
  const voteRows = [
    ...factionVotes.flatMap(({ bill_name, votes }) => {
      const billId = billIdByName.get(bill_name);
      if (!billId) return [];
      return votes.flatMap(({ faction_name, vote }) => {
        const factionId = factionIdByName.get(faction_name);
        return factionId ? [{ bill_id: billId, faction_id: factionId, vote }] : [];
      });
    }),
    ...memberVotes.flatMap(({ bill_name, votes }) => {
      const billId = billIdByName.get(bill_name);
      if (!billId) return [];
      return votes.flatMap(({ member_name, vote }) => {
        const memberId = memberIdByName.get(member_name);
        return memberId ? [{ bill_id: billId, member_id: memberId, vote }] : [];
      });
    }),
  ];
  if (voteRows.length > 0) {
    const { error } = await supabase.from("vote_records").insert(voteRows);
    if (error) {
      throw new Error(`Failed to insert vote records: ${error.message}`);
    }
  }
  console.log(`✅ Inserted ${voteRows.length} vote records`);

  console.log("📄 Inserting bill sources...");
  const sourceRows = billSources.flatMap(({ bill_name, sources }) => {
    const billId = billIdByName.get(bill_name);
    if (!billId) return [];
    return sources.map((s) => ({ ...s, bill_id: billId }));
  });
  if (sourceRows.length > 0) {
    const { error } = await supabase.from("bill_sources").insert(sourceRows);
    if (error) {
      throw new Error(`Failed to insert bill sources: ${error.message}`);
    }
  }
  console.log(`✅ Inserted ${sourceRows.length} bill sources`);

  console.log("📅 Inserting council meetings...");
  const { error: meetingsError } = await supabase
    .from("council_meetings")
    .insert(
      councilMeetings.map((m) => ({
        ...m,
        committee_id: m.category === "standing"
          ? (committeeIdByName.get(m.name) ?? null)
          : null,
        // 公開中の会議予定は確認済みであること（DB の CHECK 制約）
        confirmed_at: m.is_published ? new Date().toISOString() : null,
      }))
    );
  if (meetingsError) {
    throw new Error(`Failed to insert council meetings: ${meetingsError.message}`);
  }
  console.log(`✅ Inserted ${councilMeetings.length} council meetings`);

  console.log("✉️  Inserting reader opinions and questions...");
  const opinionRows = readerOpinions.flatMap(({ bill_name, ...row }) => {
    const billId = billIdByName.get(bill_name);
    return billId ? [{ ...row, bill_id: billId }] : [];
  });
  if (opinionRows.length > 0) {
    const { error } = await supabase.from("reader_opinions").insert(opinionRows);
    if (error) {
      throw new Error(`Failed to insert reader opinions: ${error.message}`);
    }
  }
  const questionRows = readerQuestions.map(({ bill_name, ...row }) => ({
    ...row,
    bill_id: bill_name ? (billIdByName.get(bill_name) ?? null) : null,
  }));
  if (questionRows.length > 0) {
    const { error } = await supabase
      .from("reader_questions")
      .insert(questionRows);
    if (error) {
      throw new Error(`Failed to insert reader questions: ${error.message}`);
    }
  }
  console.log(
    `✅ Inserted ${opinionRows.length} reader opinions, ${questionRows.length} reader questions`
  );
}
