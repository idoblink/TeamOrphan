import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { calculateCompatibility } from "@/lib/matching";
import { TeamDetailClient } from "./TeamDetailClient";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await getCurrentUser();

  const teamDoc = await adminDb.collection("teams").doc(params.id).get();

  if (!teamDoc.exists) {
    notFound();
  }

  const teamData = { id: teamDoc.id, ...teamDoc.data() } as any;

  // Event
  const eventDoc = await adminDb.collection("events").doc(teamData.eventId).get();
  const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;

  // Creator
  const creatorDoc = await adminDb.collection("users").doc(teamData.creatorId).get();
  const creator = creatorDoc.exists
    ? {
        id: creatorDoc.id,
        name: creatorDoc.data()!.name,
        username: creatorDoc.data()!.username,
        avatar: creatorDoc.data()!.avatar,
        bio: creatorDoc.data()!.bio,
        college: creatorDoc.data()!.college,
        location: creatorDoc.data()!.location,
      }
    : null;

  // Members
  const membersSnap = await adminDb
    .collection("teamMembers")
    .where("teamId", "==", params.id)
    .get();

  const members = await Promise.all(
    membersSnap.docs.map(async (m) => {
      const md = m.data();
      const uDoc = await adminDb.collection("users").doc(md.userId).get();
      return {
        id: m.id,
        ...md,
        user: uDoc.exists
          ? {
              id: uDoc.id,
              name: uDoc.data()!.name,
              username: uDoc.data()!.username,
              avatar: uDoc.data()!.avatar,
              bio: uDoc.data()!.bio,
              college: uDoc.data()!.college,
              location: uDoc.data()!.location,
              skills: uDoc.data()!.skills,
            }
          : null,
      };
    })
  );

  // Join Requests
  const jrSnap = await adminDb
    .collection("joinRequests")
    .where("teamId", "==", params.id)
    .orderBy("createdAt", "desc")
    .get();

  const joinRequests = await Promise.all(
    jrSnap.docs.map(async (jr) => {
      const jrd = jr.data();
      const uDoc = await adminDb.collection("users").doc(jrd.userId).get();
      return {
        id: jr.id,
        ...jrd,
        user: uDoc.exists
          ? {
              id: uDoc.id,
              name: uDoc.data()!.name,
              username: uDoc.data()!.username,
              avatar: uDoc.data()!.avatar,
              college: uDoc.data()!.college,
              location: uDoc.data()!.location,
              skills: uDoc.data()!.skills,
              interests: uDoc.data()!.interests,
            }
          : null,
      };
    })
  );

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
        team={team}
        currentUser={currentUser}
        userMatch={userMatch}
      />
    </div>
  );
}
