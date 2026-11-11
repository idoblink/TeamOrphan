import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { calculateCompatibility } from "@/lib/matching";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ matches: [] });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "teams";

    const u = user as any;

    if (type === "teams") {
      const teamsSnap = await adminDb
        .collection("teams")
        .where("status", "==", "OPEN")
        .get();

      const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      // Filter out teams created by user or where user is already a member
      const eligible: any[] = [];
      for (const team of teams) {
        if (team.creatorId === user.id) continue;

        const memberSnap = await adminDb
          .collection("teamMembers")
          .where("teamId", "==", team.id)
          .where("userId", "==", user.id)
          .limit(1)
          .get();
        if (!memberSnap.empty) continue;

        // Enrich with event
        const eventDoc = await adminDb.collection("events").doc(team.eventId).get();
        const event = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;

        const creatorDoc = await adminDb.collection("users").doc(team.creatorId).get();
        const creator = creatorDoc.exists
          ? { id: creatorDoc.id, name: creatorDoc.data()!.name, username: creatorDoc.data()!.username, avatar: creatorDoc.data()!.avatar }
          : null;

        const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", team.id).get();
        const members = membersSnap.docs.map((m) => ({ id: m.id, ...m.data() }));

        eligible.push({ ...team, event, creator, members });
      }

      const matchedTeams = eligible
        .filter((t) => t.event)
        .map((team) => {
          const matchResult = calculateCompatibility(
            { skills: u.skills, interests: u.interests, location: u.location },
            {
              requiredSkills: team.requiredSkills,
              preferredSkills: team.preferredSkills,
              category: team.event.category,
              location: team.event.location,
              mode: team.event.mode,
            }
          );
          return { team, match: matchResult };
        });

      matchedTeams.sort((a, b) => b.match.score - a.match.score);
      return NextResponse.json({ matches: matchedTeams });
    } else {
      // Type = orphans
      const orphansSnap = await adminDb
        .collection("orphanListings")
        .where("status", "==", "ACTIVE")
        .get();

      const orphans = orphansSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o: any) => o.userId !== user.id) as any[];

      const userTeamsSnap = await adminDb
        .collection("teams")
        .where("creatorId", "==", user.id)
        .where("status", "==", "OPEN")
        .get();
      const userTeams = userTeamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      // Enrich user teams with events
      const userTeamsEnriched = await Promise.all(
        userTeams.map(async (t) => {
          const eDoc = await adminDb.collection("events").doc(t.eventId).get();
          return { ...t, event: eDoc.exists ? { id: eDoc.id, ...eDoc.data() } : null };
        })
      );

      const matchedOrphans = await Promise.all(
        orphans.map(async (orphan) => {
          const uDoc = await adminDb.collection("users").doc(orphan.userId).get();
          const orphanUser = uDoc.exists ? { id: uDoc.id, ...uDoc.data() } : null;

          let bestScore = 0;
          let bestMatchResult: any = null;

          if (userTeamsEnriched.length > 0) {
            userTeamsEnriched.filter((t) => t.event).forEach((team) => {
              const res = calculateCompatibility(
                {
                  skills: orphan.skills,
                  interests: orphanUser ? (orphanUser as any).interests : "[]",
                  location: orphan.location || (orphanUser as any)?.location,
                  mode: orphan.mode,
                  availability: orphan.availability,
                  categoryPreference: orphan.targetCategory,
                },
                {
                  requiredSkills: team.requiredSkills,
                  preferredSkills: team.preferredSkills,
                  category: team.event.category,
                  location: team.event.location,
                  mode: team.event.mode,
                }
              );
              if (res.score > bestScore) {
                bestScore = res.score;
                bestMatchResult = res;
              }
            });
          } else {
            bestMatchResult = calculateCompatibility(
              { skills: orphan.skills, interests: orphanUser ? (orphanUser as any).interests : "[]", location: orphan.location },
              { requiredSkills: u.skills, category: "Hackathon" }
            );
          }

          return { orphan: { ...orphan, user: orphanUser }, match: bestMatchResult };
        })
      );

      matchedOrphans.sort((a, b) => b.match.score - a.match.score);
      return NextResponse.json({ matches: matchedOrphans });
    }
  } catch (error: any) {
    console.error("Matching engine error:", error);
    return NextResponse.json({ error: "Failed to calculate matches" }, { status: 500 });
  }
}
