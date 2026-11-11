import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { CreateEventSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db.sync();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");

    let events = db.collection("events").findMany();

    if (category && category !== "ALL") {
      events = events.filter((e: any) => e.category === category);
    }
    if (mode && mode !== "ALL") {
      events = events.filter((e: any) => e.mode === mode);
    }
    if (search) {
      const s = search.toLowerCase();
      events = events.filter(
        (e: any) =>
          e.name?.toLowerCase().includes(s) ||
          e.description?.toLowerCase().includes(s) ||
          e.location?.toLowerCase().includes(s)
      );
    }

    const enriched = events.map((event: any) => {
      const teamsCount = db.collection("teams").count((t: any) => t.eventId === event.id);
      const orphansCount = db.collection("orphanListings").count((o: any) => o.targetEventId === event.id);
      const creator = event.createdById ? db.collection("users").findUnique((u: any) => u.id === event.createdById) : null;

      return {
        ...event,
        createdBy: creator ? { id: creator.id, name: creator.name, username: creator.username } : null,
        _count: { teams: teamsCount, orphanListings: orphansCount },
      };
    });

    return NextResponse.json({ events: enriched });
  } catch (error: any) {
    console.error("Events fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.sync(true);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const validated = CreateEventSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid event data" },
        { status: 400 }
      );
    }

    const { name, description, category, startDate, location, mode } = validated.data;

    const event = db.collection("events").insert({
      name,
      description,
      category,
      startDate: new Date(startDate).toISOString(),
      location,
      mode,
      createdById: user.id,
    });

    await db.persist();

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
