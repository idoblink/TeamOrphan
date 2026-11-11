import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { CreateOrphanListingSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");
    const skill = searchParams.get("skill");

    const snap = await adminDb
      .collection("orphanListings")
      .where("status", "==", "ACTIVE")
      .orderBy("createdAt", "desc")
      .get();

    let orphans = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    if (mode && mode !== "ALL") {
      orphans = orphans.filter((o) => o.mode === mode);
    }
    if (skill) {
      orphans = orphans.filter((o) => o.skills?.toLowerCase().includes(skill.toLowerCase()));
    }
    if (search) {
      const s = search.toLowerCase();
      orphans = orphans.filter(
        (o) =>
          o.bio?.toLowerCase().includes(s) ||
          o.skills?.toLowerCase().includes(s)
      );
    }

    // Enrich with user and event data
    const enriched = await Promise.all(
      orphans.map(async (o) => {
        const uDoc = await adminDb.collection("users").doc(o.userId).get();
        const user = uDoc.exists
          ? {
              id: uDoc.id,
              name: uDoc.data()!.name,
              username: uDoc.data()!.username,
              avatar: uDoc.data()!.avatar,
              bio: uDoc.data()!.bio,
              college: uDoc.data()!.college,
              location: uDoc.data()!.location,
              skills: uDoc.data()!.skills,
              interests: uDoc.data()!.interests,
            }
          : null;

        // Category filter needs user/event data
        if (category && category !== "ALL") {
          let matchesCategory = o.targetCategory === category;
          if (!matchesCategory && o.targetEventId) {
            const eDoc = await adminDb.collection("events").doc(o.targetEventId).get();
            matchesCategory = eDoc.exists && eDoc.data()!.category === category;
          }
          if (!matchesCategory) return null;
        }

        // User search filter
        if (search) {
          const s = search.toLowerCase();
          const userMatches =
            user?.name?.toLowerCase().includes(s) ||
            user?.college?.toLowerCase().includes(s) ||
            user?.location?.toLowerCase().includes(s);
          const baseMatches = o.bio?.toLowerCase().includes(s) || o.skills?.toLowerCase().includes(s);
          if (!userMatches && !baseMatches) return null;
        }

        let targetEvent = null;
        if (o.targetEventId) {
          const eDoc = await adminDb.collection("events").doc(o.targetEventId).get();
          if (eDoc.exists) targetEvent = { id: eDoc.id, ...eDoc.data() };
        }

        return { ...o, user, targetEvent };
      })
    );

    return NextResponse.json({ orphans: enriched.filter(Boolean) });
  } catch (error: any) {
    console.error("Orphans fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orphan listings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const now = FieldValue.serverTimestamp();

    // Check existing active listing for this event
    let existingQuery = adminDb
      .collection("orphanListings")
      .where("userId", "==", user.id)
      .where("status", "==", "ACTIVE");

    if (targetEventId) {
      existingQuery = existingQuery.where("targetEventId", "==", targetEventId);
    }

    const existingSnap = await existingQuery.limit(1).get();

    const listingData = {
      targetCategory: targetCategory || null,
      skills: JSON.stringify(skills),
      experience: experience || null,
      availability,
      location: location || (user as any).location || null,
      mode,
      bio,
      updatedAt: now,
    };

    if (!existingSnap.empty) {
      await existingSnap.docs[0].ref.update(listingData);
      return NextResponse.json({ success: true, orphan: { id: existingSnap.docs[0].id, ...listingData } });
    }

    const orphanRef = await adminDb.collection("orphanListings").add({
      userId: user.id,
      targetEventId: targetEventId || null,
      ...listingData,
      status: "ACTIVE",
      createdAt: now,
    });

    return NextResponse.json({ success: true, orphan: { id: orphanRef.id, userId: user.id, ...listingData, status: "ACTIVE" } });
  } catch (error: any) {
    console.error("Create orphan listing error:", error);
    return NextResponse.json({ error: "Failed to create orphan listing" }, { status: 500 });
  }
}
