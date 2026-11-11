import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { JoinRequestSchema } from "@/lib/validation";
import { checkRecruitmentAllowed } from "@/lib/cutoff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await db.sync(true);
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

    const team = db.collection("teams").findUnique((t: any) => t.id === teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const event = db.collection("events").findUnique((e: any) => e.id === team.eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const cutoffCheck = checkRecruitmentAllowed(new Date(event.startDate));
    if (!cutoffCheck.allowed) {
      return NextResponse.json({ error: cutoffCheck.reason }, { status: 400 });
    }

    if (team.creatorId === user.id) {
      return NextResponse.json({ error: "You cannot request to join your own team." }, { status: 400 });
    }

    const members = db.collection("teamMembers").findMany((m: any) => m.teamId === teamId);
    if (members.some((m: any) => m.userId === user.id)) {
      return NextResponse.json({ error: "You are already a member of this team." }, { status: 400 });
    }

    if (members.length >= team.maxMembers || team.status === "FULL" || team.status === "CLOSED") {
      return NextResponse.json({ error: "This team is already full." }, { status: 400 });
    }

    const existing = db.collection("joinRequests").findFirst(
      (jr: any) => jr.teamId === teamId && jr.userId === user.id
    );

    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json({ error: "You already have a pending join request for this team." }, { status: 400 });
      }
      if (existing.status === "REJECTED") {
        const updated = db.collection("joinRequests").update(existing.id, {
          message: message || null,
          status: "PENDING",
        });

        db.collection("notifications").insert({
          userId: team.creatorId,
          type: "JOIN_REQUEST",
          title: `New Join Request: ${team.name}`,
          message: `${user.name} sent a join request for ${team.name}.`,
          link: `/teams/${team.id}`,
          read: false,
        });

        return NextResponse.json({ success: true, joinRequest: updated });
      }
    }

    const jr = db.collection("joinRequests").insert({
      teamId,
      userId: user.id,
      message: message || null,
      status: "PENDING",
    });

    db.collection("notifications").insert({
      userId: team.creatorId,
      type: "JOIN_REQUEST",
      title: `New Join Request: ${team.name}`,
      message: `${user.name} sent a request to join ${team.name} for ${event.name}.`,
      link: `/teams/${team.id}`,
      read: false,
    });

    await db.persist();

    return NextResponse.json({
      success: true,
      joinRequest: {
        ...jr,
        user: {
          id: user.id,
          name: (user as any).name,
          username: (user as any).username,
          avatar: (user as any).avatar,
          college: (user as any).college,
          location: (user as any).location,
          skills: (user as any).skills,
        },
      },
    });
  } catch (error: any) {
    console.error("Join request error:", error);
    return NextResponse.json({ error: "Failed to submit join request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await db.sync(true);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !["ACCEPT", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action or request ID" }, { status: 400 });
    }

    const jr = db.collection("joinRequests").findUnique((r: any) => r.id === requestId);
    if (!jr) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    const team = db.collection("teams").findUnique((t: any) => t.id === jr.teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isLeader =
      team.creatorId === user.id ||
      user.role === "ADMIN" ||
      db.collection("teamMembers").findFirst(
        (m: any) => m.teamId === jr.teamId && m.userId === user.id && m.role === "LEADER"
      );

    if (!isLeader) {
      return NextResponse.json({ error: "Only the team leader can manage join requests" }, { status: 403 });
    }

    if (action === "REJECT") {
      db.collection("joinRequests").update(requestId, { status: "REJECTED" });

      db.collection("notifications").insert({
        userId: jr.userId,
        type: "REQUEST_REJECTED",
        title: "Join Request Update",
        message: `Your request to join ${team.name} was not accepted at this time.`,
        link: `/discover`,
        read: false,
      });

      await db.persist();
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // ACCEPT: verify event hasn't started yet
    const event = db.collection("events").findUnique((e: any) => e.id === team.eventId);
    if (event) {
      const eventStart = new Date(event.startDate).getTime();
      if (Date.now() >= eventStart) {
        return NextResponse.json({ error: "Cannot accept applicants because the event has already started." }, { status: 400 });
      }
    }

    const members = db.collection("teamMembers").findMany((m: any) => m.teamId === jr.teamId);
    if (members.length >= team.maxMembers) {
      return NextResponse.json({ error: "This team is already at maximum capacity." }, { status: 400 });
    }

    const newMember = {
      id: `tm_${Date.now()}`,
      teamId: jr.teamId,
      userId: jr.userId,
      role: "MEMBER",
    };

    db.collection("teamMembers").insert(newMember);
    db.collection("joinRequests").update(requestId, { status: "ACCEPTED" });

    if (members.length + 1 >= team.maxMembers) {
      db.collection("teams").update(jr.teamId, { status: "FULL" });
    }

    db.collection("orphanListings").updateMany(
      (o: any) => o.userId === jr.userId && o.status === "ACTIVE" && o.targetEventId === team.eventId,
      { status: "MATCHED" }
    );

    db.collection("notifications").insert({
      userId: jr.userId,
      type: "REQUEST_ACCEPTED",
      title: "🎉 Request Accepted!",
      message: `Congratulations! You have joined team ${team.name}.`,
      link: `/teams/${jr.teamId}`,
      read: false,
    });

    await db.persist();

    const applicantUser = db.collection("users").findUnique((u: any) => u.id === jr.userId);

    return NextResponse.json({
      success: true,
      status: "ACCEPTED",
      member: {
        id: `tm_${Date.now()}`,
        teamId: jr.teamId,
        userId: jr.userId,
        role: "MEMBER",
        user: applicantUser
          ? {
              id: applicantUser.id,
              name: applicantUser.name,
              username: applicantUser.username,
              avatar: applicantUser.avatar,
              college: applicantUser.college,
              location: applicantUser.location,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Accept/reject error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
