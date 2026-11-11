import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const teams = tinydb.collection("teams").findMany().map((t: any) => {
      const event = tinydb.collection("events").findUnique((e: any) => e.id === t.eventId);
      const creator = tinydb.collection("users").findUnique((u: any) => u.id === t.creatorId);
      const membersCount = tinydb.collection("teamMembers").count((m: any) => m.teamId === t.id);
      const reportsCount = tinydb.collection("reports").count((r: any) => r.teamId === t.id);

      return {
        ...t,
        event,
        creator: creator ? { id: creator.id, name: creator.name, username: creator.username } : null,
        _count: { members: membersCount, reports: reportsCount },
      };
    });

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
    tinydb.collection("teams").update(teamId, { status });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin team update error:", error);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}
