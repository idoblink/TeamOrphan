import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = tinydb.collection("events").findUnique((e: any) => e.id === params.id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const createdBy = event.createdById
      ? tinydb.collection("users").findUnique((u: any) => u.id === event.createdById)
      : null;

    const teams = tinydb.collection("teams")
      .findMany((t: any) => t.eventId === params.id)
      .map((t: any) => {
        const creator = tinydb.collection("users").findUnique((u: any) => u.id === t.creatorId);
        const members = tinydb.collection("teamMembers")
          .findMany((m: any) => m.teamId === t.id)
          .map((m: any) => {
            const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
            return { ...m, user: u };
          });
        return {
          ...t,
          creator: creator ? { id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar } : null,
          members,
          _count: { members: members.length },
        };
      });

    const orphanListings = tinydb.collection("orphanListings")
      .findMany((o: any) => o.targetEventId === params.id && o.status === "ACTIVE")
      .map((o: any) => {
        const user = tinydb.collection("users").findUnique((u: any) => u.id === o.userId);
        return { ...o, user };
      });

    return NextResponse.json({
      event: {
        ...event,
        createdBy: createdBy ? { id: createdBy.id, name: createdBy.name, username: createdBy.username, avatar: createdBy.avatar } : null,
        teams,
        orphanListings,
      },
    });
  } catch (error: any) {
    console.error("Event fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
