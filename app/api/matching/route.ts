import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { calculateCompatibility } from "@/lib/matching";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db.sync();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ matches: [] });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "teams";
    const u = user as any;

    if (type === "teams") {
      const teams = db.collection("teams")
        .findMany((t: any) => t.status === "OPEN" && t.creatorId !== user.id)
        .filter((t: any) => {
          const isMember = db.collection("teamMembers").findFirst(
            (m: any) => m.teamId === t.id && m.userId === user.id
          );
          return !isMember;
        })
        .map((team: any) => {
          const event = db.collection("events").findUnique((e: any) => e.id === team.eventId);
          const creator = db.collection("users").findUnique((usr: any) => usr.id === team.creatorId);
          const members = db.collection("teamMembers").findMany((m: any) => m.teamId === team.id);
          return {
            ...team,
            event,
            creator: creator ? { id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar } : null,
            members,
          };
        })
        .filter((t: any) => t.event !== null);

      const matchedTeams = teams.map((team: any) => {
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

      matchedTeams.sort((a: any, b: any) => b.match.score - a.match.score);
      return NextResponse.json({ matches: matchedTeams });
    } else {
      const orphans = db.collection("orphanListings")
        .findMany((o: any) => o.status === "ACTIVE" && o.userId !== user.id)
        .map((o: any) => {
          const orphanUser = db.collection("users").findUnique((usr: any) => usr.id === o.userId);
          const targetEvent = o.targetEventId ? db.collection("events").findUnique((e: any) => e.id === o.targetEventId) : null;
          return { ...o, user: orphanUser, targetEvent };
        });

      const userTeams = db.collection("teams")
        .findMany((t: any) => t.creatorId === user.id && t.status === "OPEN")
        .map((t: any) => {
          const event = db.collection("events").findUnique((e: any) => e.id === t.eventId);
          return { ...t, event };
        })
        .filter((t: any) => t.event !== null);

      const matchedOrphans = orphans.map((orphan: any) => {
        let bestScore = 0;
        let bestMatchResult: any = null;

        if (userTeams.length > 0) {
          userTeams.forEach((team: any) => {
            const res = calculateCompatibility(
              {
                skills: orphan.skills,
                interests: orphan.user?.interests || "[]",
                location: orphan.location || orphan.user?.location,
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
            { skills: orphan.skills, interests: orphan.user?.interests || "[]", location: orphan.location },
            { requiredSkills: u.skills, category: "Hackathon" }
          );
        }

        return { orphan, match: bestMatchResult };
      });

      matchedOrphans.sort((a: any, b: any) => b.match.score - a.match.score);
      return NextResponse.json({ matches: matchedOrphans });
    }
  } catch (error: any) {
    console.error("Matching engine error:", error);
    return NextResponse.json({ error: "Failed to calculate matches" }, { status: 500 });
  }
}
