import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    const teamDoc = await adminDb.collection("teams").doc(params.id).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const teamData = { id: teamDoc.id, ...teamDoc.data() } as any;

    // Fetch related event
    const eventDoc = await adminDb.collection("events").doc(teamData.eventId).get();
    const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;

    // Fetch creator
    const creatorDoc = await adminDb.collection("users").doc(teamData.creatorId).get();
    const creator = creatorDoc.exists
      ? {
          id: creatorDoc.id,
          name: creatorDoc.data()!.name,
          username: creatorDoc.data()!.username,
          avatar: creatorDoc.data()!.avatar,
          bio: creatorDoc.data()!.bio,
          college: creatorDoc.data()!.college,
        }
      : null;

    // Fetch members
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

    // Fetch join requests
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
                bio: uDoc.data()!.bio,
                college: uDoc.data()!.college,
                location: uDoc.data()!.location,
                skills: uDoc.data()!.skills,
                interests: uDoc.data()!.interests,
              }
            : null,
        };
      })
    );

    const isCreator = user?.id === teamData.creatorId;
    const isMember = members.some((m: any) => m.userId === user?.id);
    const userJoinRequest = user ? joinRequests.find((r: any) => r.userId === user.id) : null;

    const sanitizedTeam = {
      ...teamData,
      event,
      creator,
      members,
      joinRequests: isCreator ? joinRequests : [],
      userJoinRequest: userJoinRequest || null,
      isCreator,
      isMember,
    };

    return NextResponse.json({ team: sanitizedTeam });
  } catch (error: any) {
    console.error("Team detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamDoc = await adminDb.collection("teams").doc(params.id).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const team = teamDoc.data()!;
    if (team.creatorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only team leader or admin can delete this team" }, { status: 403 });
    }

    // Delete related documents
    const batch = adminDb.batch();
    batch.delete(adminDb.collection("teams").doc(params.id));

    const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", params.id).get();
    membersSnap.docs.forEach((d) => batch.delete(d.ref));

    const jrSnap = await adminDb.collection("joinRequests").where("teamId", "==", params.id).get();
    jrSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Team delete error:", error);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
