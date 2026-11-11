import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { CreateTeamSchema } from "@/lib/validation";
import { checkRecruitmentAllowed } from "@/lib/cutoff";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");
    const urgency = searchParams.get("urgency");
    const skill = searchParams.get("skill");

    // Fetch all teams (Firestore doesn't support complex joins — we filter in-memory)
    let teamsQuery = adminDb.collection("teams").orderBy("createdAt", "desc");
    const teamsSnap = await teamsQuery.get();

    const teamsRaw = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    // Enrich with event data
    const eventIds = Array.from(new Set(teamsRaw.map((t: any) => t.eventId)));
    const eventsMap: Record<string, any> = {};
    for (const eid of eventIds) {
      const eDoc = await adminDb.collection("events").doc(eid).get();
      if (eDoc.exists) eventsMap[eid] = { id: eDoc.id, ...eDoc.data() };
    }

    // Enrich with creator + members
    const enriched = await Promise.all(
      teamsRaw.map(async (team: any) => {
        const event = eventsMap[team.eventId] || null;
        const creatorDoc = await adminDb.collection("users").doc(team.creatorId).get();
        const creator = creatorDoc.exists
          ? { id: creatorDoc.id, name: creatorDoc.data()!.name, username: creatorDoc.data()!.username, avatar: creatorDoc.data()!.avatar }
          : null;

        const membersSnap = await adminDb
          .collection("teamMembers")
          .where("teamId", "==", team.id)
          .get();
        const members = await Promise.all(
          membersSnap.docs.map(async (m) => {
            const md = m.data();
            const uDoc = await adminDb.collection("users").doc(md.userId).get();
            return {
              id: m.id,
              ...md,
              user: uDoc.exists ? { id: uDoc.id, name: uDoc.data()!.name, username: uDoc.data()!.username, avatar: uDoc.data()!.avatar } : null,
            };
          })
        );

        return { ...team, event, creator, members };
      })
    );

    // Apply filters
    let filtered = enriched.filter((t) => t.event !== null);

    if (category && category !== "ALL") {
      filtered = filtered.filter((t) => t.event?.category === category);
    }
    if (mode && mode !== "ALL") {
      filtered = filtered.filter((t) => t.event?.mode === mode);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s) ||
          t.requiredSkills?.toLowerCase().includes(s) ||
          t.event?.name?.toLowerCase().includes(s)
      );
    }
    if (skill) {
      filtered = filtered.filter((t) => t.requiredSkills?.toLowerCase().includes(skill.toLowerCase()));
    }
    if (urgency === "urgent") {
      const now = Date.now();
      filtered = filtered.filter((t) => {
        const start = new Date(t.event.startDate._seconds ? t.event.startDate._seconds * 1000 : t.event.startDate).getTime();
        const cutoff = start - 24 * 60 * 60 * 1000;
        const remaining = cutoff - now;
        return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
      });
    } else if (urgency === "open") {
      const now = Date.now();
      filtered = filtered.filter((t) => {
        const start = new Date(t.event.startDate._seconds ? t.event.startDate._seconds * 1000 : t.event.startDate).getTime();
        const cutoff = start - 24 * 60 * 60 * 1000;
        return now < cutoff && t.status === "OPEN";
      });
    }

    return NextResponse.json({ teams: filtered });
  } catch (error: any) {
    console.error("Teams fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const validated = CreateTeamSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid team details" },
        { status: 400 }
      );
    }

    const { name, eventId, maxMembers, description, requiredSkills, preferredSkills, contactInfo } =
      validated.data;

    // Verify event exists
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const startDate = eventData.startDate?.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);
    const cutoffCheck = checkRecruitmentAllowed(startDate);
    if (!cutoffCheck.allowed) {
      return NextResponse.json({ error: cutoffCheck.reason }, { status: 400 });
    }

    const batch = adminDb.batch();
    const teamRef = adminDb.collection("teams").doc();
    const now = FieldValue.serverTimestamp();

    batch.set(teamRef, {
      name,
      eventId,
      creatorId: user.id,
      maxMembers,
      description,
      requiredSkills: JSON.stringify(requiredSkills),
      preferredSkills: JSON.stringify(preferredSkills || []),
      contactInfo: contactInfo || null,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as LEADER member
    const memberRef = adminDb.collection("teamMembers").doc();
    batch.set(memberRef, {
      teamId: teamRef.id,
      userId: user.id,
      role: "LEADER",
      joinedAt: now,
    });

    await batch.commit();

    const team = {
      id: teamRef.id,
      name,
      eventId,
      creatorId: user.id,
      maxMembers,
      description,
      requiredSkills: JSON.stringify(requiredSkills),
      preferredSkills: JSON.stringify(preferredSkills || []),
      contactInfo: contactInfo || null,
      status: "OPEN",
      event: { id: eventDoc.id, ...eventData },
    };

    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
