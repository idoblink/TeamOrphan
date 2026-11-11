import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventDoc = await adminDb.collection("events").doc(params.id).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const eventData = { id: eventDoc.id, ...eventDoc.data() } as any;

    // Creator
    let createdBy = null;
    if (eventData.createdById) {
      const uDoc = await adminDb.collection("users").doc(eventData.createdById).get();
      if (uDoc.exists) {
        const ud = uDoc.data()!;
        createdBy = { id: uDoc.id, name: ud.name, username: ud.username, avatar: ud.avatar };
      }
    }

    // Teams
    const teamsSnap = await adminDb
      .collection("teams")
      .where("eventId", "==", params.id)
      .get();
    const teams = await Promise.all(
      teamsSnap.docs.map(async (t) => {
        const td = { id: t.id, ...t.data() } as any;

        const creatorDoc = await adminDb.collection("users").doc(td.creatorId).get();
        const creator = creatorDoc.exists
          ? { id: creatorDoc.id, name: creatorDoc.data()!.name, username: creatorDoc.data()!.username, avatar: creatorDoc.data()!.avatar }
          : null;

        const membersSnap = await adminDb
          .collection("teamMembers")
          .where("teamId", "==", t.id)
          .get();
        const members = await Promise.all(
          membersSnap.docs.map(async (m) => {
            const md = m.data();
            const uDoc = await adminDb.collection("users").doc(md.userId).get();
            return {
              id: m.id,
              ...md,
              user: uDoc.exists
                ? { id: uDoc.id, name: uDoc.data()!.name, username: uDoc.data()!.username, avatar: uDoc.data()!.avatar, skills: uDoc.data()!.skills }
                : null,
            };
          })
        );

        return { ...td, creator, members, _count: { members: membersSnap.size } };
      })
    );

    // Orphan listings
    const orphansSnap = await adminDb
      .collection("orphanListings")
      .where("targetEventId", "==", params.id)
      .where("status", "==", "ACTIVE")
      .get();
    const orphanListings = await Promise.all(
      orphansSnap.docs.map(async (o) => {
        const od = { id: o.id, ...o.data() } as any;
        const uDoc = await adminDb.collection("users").doc(od.userId).get();
        return {
          ...od,
          user: uDoc.exists
            ? { id: uDoc.id, name: uDoc.data()!.name, username: uDoc.data()!.username, avatar: uDoc.data()!.avatar, college: uDoc.data()!.college, location: uDoc.data()!.location, skills: uDoc.data()!.skills }
            : null,
        };
      })
    );

    return NextResponse.json({ event: { ...eventData, createdBy, teams, orphanListings } });
  } catch (error: any) {
    console.error("Event fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
