import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await tinydb.sync();
    const user = await getCurrentUser();

    let team = tinydb.collection("teams").findUnique((t: any) => t.id === params.id);
    if (!team) {
      await tinydb.sync(true);
      team = tinydb.collection("teams").findUnique((t: any) => t.id === params.id);
    }
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const event = tinydb.collection("events").findUnique((e: any) => e.id === team.eventId);
    const creator = tinydb.collection("users").findUnique((u: any) => u.id === team.creatorId);

    const members = tinydb.collection("teamMembers")
      .findMany((m: any) => m.teamId === params.id)
      .map((m: any) => {
        const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
        return { ...m, user: u };
      });

    const joinRequests = tinydb.collection("joinRequests")
      .findMany((jr: any) => jr.teamId === params.id)
      .map((jr: any) => {
        const u = tinydb.collection("users").findUnique((usr: any) => usr.id === jr.userId);
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
    await tinydb.sync(true);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = tinydb.collection("teams").findUnique((t: any) => t.id === params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.creatorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only team leader or admin can delete this team" }, { status: 403 });
    }

    tinydb.collection("teams").delete(params.id);
    tinydb.collection("teamMembers").deleteMany((m: any) => m.teamId === params.id);
    tinydb.collection("joinRequests").deleteMany((jr: any) => jr.teamId === params.id);

    await tinydb.persist();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Team delete error:", error);
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
