import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.sync();
    const user = await getCurrentUser();

    let team = db.collection("teams").findUnique((t: any) => t.id === params.id);
    if (!team) {
      await db.sync(true);
      team = db.collection("teams").findUnique((t: any) => t.id === params.id);
    }
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const event = db.collection("events").findUnique((e: any) => e.id === team.eventId);
    const creator = db.collection("users").findUnique((u: any) => u.id === team.creatorId);

    const members = db.collection("teamMembers")
      .findMany((m: any) => m.teamId === params.id)
      .map((m: any) => {
        const u = db.collection("users").findUnique((usr: any) => usr.id === m.userId);
        return { ...m, user: u };
      });

    const joinRequests = db.collection("joinRequests")
      .findMany((jr: any) => jr.teamId === params.id)
      .map((jr: any) => {
        const u = db.collection("users").findUnique((usr: any) => usr.id === jr.userId);
        return { ...jr, user: u };
      });

    const isCreator = user?.id === team.creatorId;
    const isMember = members.some((m: any) => m.userId === user?.id);
    const userJoinRequest = user ? joinRequests.find((r: any) => r.userId === user.id) : null;

    const sanitizedTeam = {
      ...team,
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
    await db.sync(true);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = db.collection("teams").findUnique((t: any) => t.id === params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.creatorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only team leader or admin can delete this team" }, { status: 403 });
    }

    db.collection("teams").delete(params.id);
    db.collection("teamMembers").deleteMany((m: any) => m.teamId === params.id);
    db.collection("joinRequests").deleteMany((jr: any) => jr.teamId === params.id);

    await db.persist();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Team delete error:", error);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
