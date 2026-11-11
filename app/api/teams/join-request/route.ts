import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { JoinRequestSchema } from "@/lib/validation";
import { checkRecruitmentAllowed } from "@/lib/cutoff";
import { FieldValue } from "firebase-admin/firestore";

// POST: Submit a Join Request
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to join a team" }, { status: 401 });
    }

    const body = await req.json();
    const validated = JoinRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid join request" },
        { status: 400 }
      );
    }

    const { teamId, message } = validated.data;

    // Fetch team
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const team = { id: teamDoc.id, ...teamDoc.data() } as any;

    // Fetch event for cutoff check
    const eventDoc = await adminDb.collection("events").doc(team.eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const eventData = eventDoc.data()!;
    const startDate = eventData.startDate?.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);

    // 1. 24-Hour Cutoff Rule
    const cutoffCheck = checkRecruitmentAllowed(startDate);
    if (!cutoffCheck.allowed) {
      return NextResponse.json({ error: cutoffCheck.reason }, { status: 400 });
    }

    // 2. Prevent joining own team
    if (team.creatorId === user.id) {
      return NextResponse.json({ error: "You cannot request to join your own team." }, { status: 400 });
    }

    // Fetch members
    const membersSnap = await adminDb
      .collection("teamMembers")
      .where("teamId", "==", teamId)
      .get();

    // 3. Already a member
    if (membersSnap.docs.some((m) => m.data().userId === user.id)) {
      return NextResponse.json({ error: "You are already a member of this team." }, { status: 400 });
    }

    // 4. Team full
    if (membersSnap.size >= team.maxMembers || team.status === "FULL" || team.status === "CLOSED") {
      return NextResponse.json({ error: "This team is already full." }, { status: 400 });
    }

    // 5. Check duplicate request
    const existingSnap = await adminDb
      .collection("joinRequests")
      .where("teamId", "==", teamId)
      .where("userId", "==", user.id)
      .limit(1)
      .get();

    const now = FieldValue.serverTimestamp();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      const existingData = existing.data();

      if (existingData.status === "PENDING") {
        return NextResponse.json({ error: "You already have a pending join request for this team." }, { status: 400 });
      }
      if (existingData.status === "REJECTED") {
        await existing.ref.update({ message: message || null, status: "PENDING", updatedAt: now });

        await adminDb.collection("notifications").add({
          userId: team.creatorId,
          type: "JOIN_REQUEST",
          title: `New Join Request: ${team.name}`,
          message: `${user.name} sent a join request for ${team.name}.`,
          link: `/teams/${team.id}`,
          read: false,
          createdAt: now,
        });

        return NextResponse.json({ success: true, joinRequest: { id: existing.id, ...existingData, status: "PENDING" } });
      }
    }

    // Create new join request
    const jrRef = await adminDb.collection("joinRequests").add({
      teamId,
      userId: user.id,
      message: message || null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    await adminDb.collection("notifications").add({
      userId: team.creatorId,
      type: "JOIN_REQUEST",
      title: `New Join Request: ${team.name}`,
      message: `${user.name} sent a request to join ${team.name} for ${eventData.name}.`,
      link: `/teams/${team.id}`,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({ success: true, joinRequest: { id: jrRef.id, teamId, userId: user.id, message, status: "PENDING" } });
  } catch (error: any) {
    console.error("Join request error:", error);
    return NextResponse.json({ error: "Failed to submit join request" }, { status: 500 });
  }
}

// PATCH: Accept or Reject Join Request
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !["ACCEPT", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action or request ID" }, { status: 400 });
    }

    const jrDoc = await adminDb.collection("joinRequests").doc(requestId).get();
    if (!jrDoc.exists) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }
    const jr = { id: jrDoc.id, ...jrDoc.data() } as any;

    const teamDoc = await adminDb.collection("teams").doc(jr.teamId).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const team = { id: teamDoc.id, ...teamDoc.data() } as any;

    if (team.creatorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the team leader can manage join requests" }, { status: 403 });
    }

    const now = FieldValue.serverTimestamp();

    if (action === "REJECT") {
      await jrDoc.ref.update({ status: "REJECTED", updatedAt: now });

      await adminDb.collection("notifications").add({
        userId: jr.userId,
        type: "REQUEST_REJECTED",
        title: "Join Request Update",
        message: `Your request to join ${team.name} was not accepted at this time.`,
        link: `/discover`,
        read: false,
        createdAt: now,
      });

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // ACCEPT
    const eventDoc = await adminDb.collection("events").doc(team.eventId).get();
    const eventData = eventDoc.data()!;
    const startDate = eventData.startDate?.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);

    const cutoffCheck = checkRecruitmentAllowed(startDate);
    if (!cutoffCheck.allowed) {
      return NextResponse.json({ error: cutoffCheck.reason }, { status: 400 });
    }

    const membersSnap = await adminDb
      .collection("teamMembers")
      .where("teamId", "==", jr.teamId)
      .get();

    if (membersSnap.size >= team.maxMembers) {
      return NextResponse.json({ error: "This team is already at maximum capacity." }, { status: 400 });
    }

    // Batch: add member, update request, check if full, notify
    const batch = adminDb.batch();

    const newMemberRef = adminDb.collection("teamMembers").doc();
    batch.set(newMemberRef, {
      teamId: jr.teamId,
      userId: jr.userId,
      role: "MEMBER",
      joinedAt: now,
    });

    batch.update(jrDoc.ref, { status: "ACCEPTED", updatedAt: now });

    const newCount = membersSnap.size + 1;
    if (newCount >= team.maxMembers) {
      batch.update(adminDb.collection("teams").doc(jr.teamId), { status: "FULL", updatedAt: now });
    }

    const notifRef = adminDb.collection("notifications").doc();
    batch.set(notifRef, {
      userId: jr.userId,
      type: "REQUEST_ACCEPTED",
      title: "🎉 Request Accepted!",
      message: `Congratulations! You have joined team ${team.name} for ${eventData.name}.`,
      link: `/teams/${jr.teamId}`,
      read: false,
      createdAt: now,
    });

    // Update matching orphan listing if exists
    const orphanSnap = await adminDb
      .collection("orphanListings")
      .where("userId", "==", jr.userId)
      .where("status", "==", "ACTIVE")
      .where("targetEventId", "==", team.eventId)
      .get();
    orphanSnap.docs.forEach((d) => batch.update(d.ref, { status: "MATCHED", updatedAt: now }));

    await batch.commit();

    return NextResponse.json({ success: true, status: "ACCEPTED" });
  } catch (error: any) {
    console.error("Accept/reject error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
