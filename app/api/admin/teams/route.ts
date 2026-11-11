import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const snap = await adminDb.collection("teams").orderBy("createdAt", "desc").get();

    const teams = await Promise.all(
      snap.docs.map(async (d) => {
        const t = { id: d.id, ...d.data() } as any;

        const eventDoc = await adminDb.collection("events").doc(t.eventId).get();
        const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;

        const creatorDoc = await adminDb.collection("users").doc(t.creatorId).get();
        const creator = creatorDoc.exists
          ? { id: creatorDoc.id, name: creatorDoc.data()!.name, username: creatorDoc.data()!.username }
          : null;

        const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", d.id).get();
        const reportsSnap = await adminDb.collection("reports").where("teamId", "==", d.id).get();

        return { ...t, event, creator, _count: { members: membersSnap.size, reports: reportsSnap.size } };
      })
    );

    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error("Admin teams fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { teamId, status } = await req.json();

    await adminDb.collection("teams").doc(teamId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin team update error:", error);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}
