import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { CreateEventSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");

    let query: FirebaseFirestore.Query = adminDb.collection("events").orderBy("startDate", "asc");
    const snap = await query.get();

    let events = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    if (category && category !== "ALL") {
      events = events.filter((e) => e.category === category);
    }
    if (mode && mode !== "ALL") {
      events = events.filter((e) => e.mode === mode);
    }
    if (search) {
      const s = search.toLowerCase();
      events = events.filter(
        (e) =>
          e.name?.toLowerCase().includes(s) ||
          e.description?.toLowerCase().includes(s) ||
          e.location?.toLowerCase().includes(s)
      );
    }

    // Enrich with counts and creator
    const enriched = await Promise.all(
      events.map(async (event) => {
        const teamsSnap = await adminDb
          .collection("teams")
          .where("eventId", "==", event.id)
          .get();
        const orphansSnap = await adminDb
          .collection("orphanListings")
          .where("targetEventId", "==", event.id)
          .get();

        let createdBy = null;
        if (event.createdById) {
          const uDoc = await adminDb.collection("users").doc(event.createdById).get();
          if (uDoc.exists) {
            const ud = uDoc.data()!;
            createdBy = { id: uDoc.id, name: ud.name, username: ud.username };
          }
        }

        return {
          ...event,
          createdBy,
          _count: { teams: teamsSnap.size, orphanListings: orphansSnap.size },
        };
      })
    );

    return NextResponse.json({ events: enriched });
  } catch (error: any) {
    console.error("Events fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const now = FieldValue.serverTimestamp();

    const eventRef = await adminDb.collection("events").add({
      name,
      description,
      category,
      startDate: new Date(startDate),
      location,
      mode,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, event: { id: eventRef.id, name, description, category, startDate, location, mode } });
  } catch (error: any) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
