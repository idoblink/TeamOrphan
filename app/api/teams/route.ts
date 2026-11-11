import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { CreateTeamSchema } from "@/lib/validation";
import { checkRecruitmentAllowed } from "@/lib/cutoff";
import { saveTeamToCookie, saveMemberToCookie, syncDatabaseFromCookies } from "@/lib/cookie-sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await tinydb.sync();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const search = searchParams.get("search");
    const urgency = searchParams.get("urgency");
    const skill = searchParams.get("skill");

    const teamsRaw = tinydb.collection("teams").findMany();

    // Enrich teams
    const enriched = teamsRaw.map((team: any) => {
      const event = tinydb.collection("events").findUnique((e: any) => e.id === team.eventId);
      const creator = tinydb.collection("users").findUnique((u: any) => u.id === team.creatorId);
      const members = tinydb.collection("teamMembers")
        .findMany((m: any) => m.teamId === team.id)
        .map((m: any) => {
          const user = tinydb.collection("users").findUnique((u: any) => u.id === m.userId);
          return { ...m, user };
        });

      return {
        ...team,
        event,
        creator: creator ? { id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar } : null,
        members,
        _count: { members: members.length },
      };
    });

    let filtered = enriched.filter((t: any) => t.event !== null);

    if (category && category !== "ALL") {
      filtered = filtered.filter((t: any) => t.event?.category === category);
    }
    if (mode && mode !== "ALL") {
      filtered = filtered.filter((t: any) => t.event?.mode === mode);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (t: any) =>
          t.name?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s) ||
          t.requiredSkills?.toLowerCase().includes(s) ||
          t.event?.name?.toLowerCase().includes(s)
      );
    }
    if (skill) {
      filtered = filtered.filter((t: any) => t.requiredSkills?.toLowerCase().includes(skill.toLowerCase()));
    }
    if (urgency === "urgent") {
      const now = Date.now();
      filtered = filtered.filter((t: any) => {
        const start = new Date(t.event.startDate).getTime();
        const cutoff = start - 24 * 60 * 60 * 1000;
        const remaining = cutoff - now;
        return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
      });
    } else if (urgency === "open") {
      const now = Date.now();
      filtered = filtered.filter((t: any) => {
        const start = new Date(t.event.startDate).getTime();
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
    await tinydb.sync(true);
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

    const event = tinydb.collection("events").findUnique((e: any) => e.id === eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const cutoffCheck = checkRecruitmentAllowed(new Date(event.startDate));
    if (!cutoffCheck.allowed) {
      return NextResponse.json({ error: cutoffCheck.reason }, { status: 400 });
    }

    const team = tinydb.collection("teams").insert({
      name,
      eventId,
      creatorId: user.id,
      maxMembers,
      description,
      requiredSkills: JSON.stringify(requiredSkills),
      preferredSkills: JSON.stringify(preferredSkills || []),
      contactInfo: contactInfo || null,
      status: "OPEN",
    });

    const member = tinydb.collection("teamMembers").insert({
      teamId: team.id,
      userId: user.id,
      role: "LEADER",
    });

    await tinydb.persist();

    return NextResponse.json({ success: true, team: { ...team, event } });
  } catch (error: any) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
