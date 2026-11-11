import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { CreateOrphanListingSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db.sync();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");
    const skill = searchParams.get("skill");

    let orphans = db.collection("orphanListings").findMany((o: any) => o.status === "ACTIVE");

    if (mode && mode !== "ALL") {
      orphans = orphans.filter((o: any) => o.mode === mode);
    }
    if (skill) {
      orphans = orphans.filter((o: any) => o.skills?.toLowerCase().includes(skill.toLowerCase()));
    }
    if (search) {
      const s = search.toLowerCase();
      orphans = orphans.filter(
        (o: any) =>
          o.bio?.toLowerCase().includes(s) ||
          o.skills?.toLowerCase().includes(s)
      );
    }

    const enriched = orphans.map((o: any) => {
      const user = db.collection("users").findUnique((u: any) => u.id === o.userId);
      const targetEvent = o.targetEventId ? db.collection("events").findUnique((e: any) => e.id === o.targetEventId) : null;
      return { ...o, user, targetEvent };
    });

    let filtered = enriched;
    if (category && category !== "ALL") {
      filtered = filtered.filter((o: any) => o.targetCategory === category || o.targetEvent?.category === category);
    }

    return NextResponse.json({ orphans: filtered });
  } catch (error: any) {
    console.error("Orphans fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orphan listings" }, { status: 500 });
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
    const validated = CreateOrphanListingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid orphan listing data" },
        { status: 400 }
      );
    }

    const { targetEventId, targetCategory, skills, experience, availability, location, mode, bio } =
      validated.data;

    const existing = db.collection("orphanListings").findFirst(
      (o: any) => o.userId === user.id && o.status === "ACTIVE" && (!targetEventId || o.targetEventId === targetEventId)
    );

    const payload = {
      targetCategory: targetCategory || null,
      skills: JSON.stringify(skills),
      experience: experience || null,
      availability,
      location: location || (user as any).location || null,
      mode,
      bio,
    };

    if (existing) {
      const updated = db.collection("orphanListings").update(existing.id, payload);
      await db.persist();
      return NextResponse.json({ success: true, orphan: updated });
    }

    const orphan = db.collection("orphanListings").insert({
      userId: user.id,
      targetEventId: targetEventId || null,
      ...payload,
      status: "ACTIVE",
    });

    await db.persist();

    return NextResponse.json({ success: true, orphan });
  } catch (error: any) {
    console.error("Create orphan listing error:", error);
    return NextResponse.json({ error: "Failed to create orphan listing" }, { status: 500 });
  }
}
