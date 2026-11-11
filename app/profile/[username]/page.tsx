import { notFound } from "next/navigation";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { calculateCompatibility } from "@/lib/matching";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const currentUser = await getCurrentUser();

  await tinydb.sync();
  let profileUserData = tinydb.collection("users").findFirst(
    (u: any) => u.username?.toLowerCase() === params.username?.toLowerCase()
  );
  if (!profileUserData) {
    await tinydb.sync(true);
    profileUserData = tinydb.collection("users").findFirst(
      (u: any) => u.username?.toLowerCase() === params.username?.toLowerCase()
    );
  }

  if (!profileUserData) {
    notFound();
  }

  const memberships = tinydb.collection("teamMembers")
    .findMany((m: any) => m.userId === profileUserData.id)
    .map((m: any) => {
      const teamData = tinydb.collection("teams").findUnique((t: any) => t.id === m.teamId);
      let team = null;
      if (teamData) {
        const event = tinydb.collection("events").findUnique((e: any) => e.id === teamData.eventId);
        team = { ...teamData, event };
      }
      return { ...m, team };
    });

  const createdTeams = tinydb.collection("teams")
    .findMany((t: any) => t.creatorId === profileUserData.id)
    .map((t: any) => {
      const event = tinydb.collection("events").findUnique((e: any) => e.id === t.eventId);
      return { ...t, event };
    });

  const profileUser = {
    ...profileUserData,
    memberships,
    createdTeams,
  };

  let userMatch = null;
  if (currentUser && currentUser.id !== profileUser.id) {
    userMatch = calculateCompatibility(
      {
        skills: profileUser.skills,
        interests: profileUser.interests,
        location: profileUser.location,
      },
      {
        requiredSkills: (currentUser as any).skills,
        category: "Hackathon",
      }
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <ProfileClient
        profileUser={profileUser}
        currentUser={currentUser}
        userMatch={userMatch}
      />
    </div>
  );
}
