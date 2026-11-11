import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
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

  const userSnap = await adminDb
    .collection("users")
    .where("username", "==", params.username)
    .limit(1)
    .get();

  if (userSnap.empty) {
    notFound();
  }

  const userDoc = userSnap.docs[0];
  const profileUserData = { id: userDoc.id, ...userDoc.data() } as any;

  // Fetch memberships
  const membershipsSnap = await adminDb
    .collection("teamMembers")
    .where("userId", "==", profileUserData.id)
    .get();

  const memberships = await Promise.all(
    membershipsSnap.docs.map(async (m) => {
      const mData = m.data();
      const teamDoc = await adminDb.collection("teams").doc(mData.teamId).get();
      let team = null;
      if (teamDoc.exists) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as any;
        const eventDoc = await adminDb.collection("events").doc(teamData.eventId).get();
        const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;
        team = { ...teamData, event };
      }
      return { id: m.id, ...mData, team };
    })
  );

  // Fetch created teams
  const createdTeamsSnap = await adminDb
    .collection("teams")
    .where("creatorId", "==", profileUserData.id)
    .get();

  const createdTeams = await Promise.all(
    createdTeamsSnap.docs.map(async (t) => {
      const tData = { id: t.id, ...t.data() } as any;
      const eventDoc = await adminDb.collection("events").doc(tData.eventId).get();
      const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;
      return { ...tData, event };
    })
  );

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
