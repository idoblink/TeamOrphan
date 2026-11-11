import { notFound } from "next/navigation";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { calculateCompatibility } from "@/lib/matching";
import { syncDatabaseFromCookies } from "@/lib/cookie-sync";
import { TeamDetailClient } from "./TeamDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function TeamPage({
  params,
}: {
  params: { id: string };
}) {
  await tinydb.sync(true);
  const currentUser = await getCurrentUser();

  let teamData = tinydb.collection("teams").findUnique((t: any) => t.id === params.id);
  if (!teamData) {
    await tinydb.sync(true);
    teamData = tinydb.collection("teams").findUnique((t: any) => t.id === params.id);
  }
  if (!teamData) notFound();

  const event = tinydb.collection("events").findUnique((e: any) => e.id === teamData.eventId);
  const creator = tinydb.collection("users").findUnique((u: any) => u.id === teamData.creatorId);

  const members = tinydb.collection("teamMembers")
    .findMany((m: any) => m.teamId === params.id)
    .map((m: any) => {
      const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
      return { id: m.id, ...m, user: u };
    });

  const joinRequests = tinydb.collection("joinRequests")
    .findMany((jr: any) => jr.teamId === params.id)
    .map((jr: any) => {
      const u = tinydb.collection("users").findUnique((usr: any) => usr.id === jr.userId);
      return { id: jr.id, ...jr, user: u };
    });

  const team = {
    ...teamData,
    event,
    creator,
    members,
    joinRequests,
  };

  let userMatch = null;
  if (currentUser && team.event) {
    userMatch = calculateCompatibility(
      {
        skills: (currentUser as any).skills,
        interests: (currentUser as any).interests,
        location: (currentUser as any).location,
      },
      {
        requiredSkills: team.requiredSkills,
        preferredSkills: team.preferredSkills,
        category: team.event.category,
        location: team.event.location,
        mode: team.event.mode,
      }
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <TeamDetailClient
        initialTeam={team}
        currentUser={currentUser}
        userMatch={userMatch}
      />
    </div>
  );
}
