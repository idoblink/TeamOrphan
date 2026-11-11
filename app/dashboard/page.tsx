import { redirect } from "next/navigation";
import Link from "next/link";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { TeamCard } from "@/components/cards/TeamCard";
import { OrphanCard } from "@/components/cards/OrphanCard";
import { Avatar } from "@/components/ui/Avatar";
import { SkillTag } from "@/components/ui/SkillTag";
import { IncomingRequestsManager, IncomingRequestItem } from "@/components/dashboard/IncomingRequestsManager";
import { calculateCompatibility } from "@/lib/matching";
import { parseJsonArray } from "@/lib/utils";
import { syncDatabaseFromCookies } from "@/lib/cookie-sync";
import {
  Users,
  Compass,
  Zap,
  Sparkles,
  Inbox,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  syncDatabaseFromCookies();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const u = user as any;
  const userSkills = parseJsonArray(u.skills);

  // 1. My created teams
  const myTeams = tinydb.collection("teams")
    .findMany((t: any) => t.creatorId === u.id)
    .map((td: any) => {
      const event = tinydb.collection("events").findUnique((e: any) => e.id === td.eventId);
      const members = tinydb.collection("teamMembers")
        .findMany((m: any) => m.teamId === td.id)
        .map((m: any) => {
          const usr = tinydb.collection("users").findUnique((us: any) => us.id === m.userId);
          return { id: m.id, ...m, user: usr ? { id: usr.id, name: usr.name, avatar: usr.avatar } : null };
        });
      const joinRequests = tinydb.collection("joinRequests")
        .findMany((jr: any) => jr.teamId === td.id && jr.status === "PENDING");
      return { ...td, event, members, joinRequests, _count: { members: members.length, joinRequests: joinRequests.length } };
    });

  // Collect pending applications for squads this user leads
  const incomingRequests: IncomingRequestItem[] = [];
  myTeams.forEach((t: any) => {
    t.joinRequests?.forEach((jr: any) => {
      const applicant = tinydb.collection("users").findUnique((usr: any) => usr.id === jr.userId);
      incomingRequests.push({
        id: jr.id,
        teamId: t.id,
        teamName: t.name,
        message: jr.message,
        createdAt: jr.createdAt,
        user: {
          id: jr.userId,
          name: applicant?.name || "Applicant",
          username: applicant?.username || "applicant",
          avatar: applicant?.avatar || null,
          college: applicant?.college || null,
          location: applicant?.location || null,
          skills: applicant?.skills || JSON.stringify([]),
        },
      });
    });
  });

  // 2. Member teams
  const memberTeams = tinydb.collection("teamMembers")
    .findMany((m: any) => m.userId === u.id)
    .map((m: any) => {
      const td = tinydb.collection("teams").findUnique((t: any) => t.id === m.teamId);
      if (!td || td.creatorId === u.id) return null;
      const event = tinydb.collection("events").findUnique((e: any) => e.id === td.eventId);
      const creator = tinydb.collection("users").findUnique((us: any) => us.id === td.creatorId);
      const members = tinydb.collection("teamMembers").findMany((tm: any) => tm.teamId === td.id);
      return { ...td, event, creator, members, _count: { members: members.length } };
    })
    .filter(Boolean);

  // 3. My orphan listings
  const myOrphanListings = tinydb.collection("orphanListings")
    .findMany((o: any) => o.userId === u.id)
    .map((od: any) => {
      const targetEvent = od.targetEventId ? tinydb.collection("events").findUnique((e: any) => e.id === od.targetEventId) : null;
      return { ...od, targetEvent };
    });

  // 4. Sent requests
  const mySentRequests = tinydb.collection("joinRequests")
    .findMany((jr: any) => jr.userId === u.id)
    .map((jrd: any) => {
      const td = tinydb.collection("teams").findUnique((t: any) => t.id === jrd.teamId);
      if (!td) return null;
      const event = tinydb.collection("events").findUnique((e: any) => e.id === td.eventId);
      const creator = tinydb.collection("users").findUnique((us: any) => us.id === td.creatorId);
      return { ...jrd, team: { ...td, event, creator } };
    })
    .filter(Boolean);

  // 5. Recommended teams
  const openTeams = tinydb.collection("teams")
    .findMany((t: any) => t.status === "OPEN" && t.creatorId !== u.id)
    .filter((t: any) => {
      const isMember = tinydb.collection("teamMembers").findFirst((m: any) => m.teamId === t.id && m.userId === u.id);
      return !isMember;
    })
    .map((t: any) => {
      const event = tinydb.collection("events").findUnique((e: any) => e.id === t.eventId);
      const creator = tinydb.collection("users").findUnique((us: any) => us.id === t.creatorId);
      const members = tinydb.collection("teamMembers").findMany((m: any) => m.teamId === t.id);
      return { ...t, event, creator, members, _count: { members: members.length } };
    })
    .filter((t: any) => t.event !== null);

  const recommendedTeams = openTeams
    .map((team: any) => {
      const match = calculateCompatibility(
        { skills: u.skills, interests: u.interests, location: u.location },
        { requiredSkills: team.requiredSkills, preferredSkills: team.preferredSkills, category: team.event.category, location: team.event.location, mode: team.event.mode }
      );
      return { team, match };
    })
    .sort((a: any, b: any) => b.match.score - a.match.score)
    .slice(0, 3);

  // 6. Recommended orphans
  const activeOrphans = tinydb.collection("orphanListings")
    .findMany((o: any) => o.status === "ACTIVE" && o.userId !== u.id)
    .map((od: any) => {
      const orphanUser = tinydb.collection("users").findUnique((us: any) => us.id === od.userId);
      const targetEvent = od.targetEventId ? tinydb.collection("events").findUnique((e: any) => e.id === od.targetEventId) : null;
      return { ...od, user: orphanUser, targetEvent };
    });

  const recommendedOrphans = activeOrphans
    .map((orphan: any) => {
      let bestMatch: any = null;
      let highestScore = 0;
      if (myTeams.length > 0) {
        myTeams.forEach((team: any) => {
          if (!team.event) return;
          const match = calculateCompatibility(
            { skills: orphan.skills, interests: orphan.user?.interests || "[]", location: orphan.location || orphan.user?.location, mode: orphan.mode, availability: orphan.availability, categoryPreference: orphan.targetCategory },
            { requiredSkills: team.requiredSkills, preferredSkills: team.preferredSkills, category: team.event.category, location: team.event.location, mode: team.event.mode }
          );
          if (match.score > highestScore) { highestScore = match.score; bestMatch = match; }
        });
      } else {
        bestMatch = calculateCompatibility(
          { skills: orphan.skills, interests: orphan.user?.interests || "[]", location: orphan.location },
          { requiredSkills: u.skills, category: "Hackathon" }
        );
      }
      return { orphan, match: bestMatch };
    })
    .sort((a: any, b: any) => (b.match?.score || 0) - (a.match?.score || 0))
    .slice(0, 3);

  const totalPendingOnMyTeams = myTeams.reduce((acc: number, t: any) => acc + (t.joinRequests?.length || 0), 0);

  return (
    <div className="py-8 px-4 sm:px-6 space-y-10 max-w-7xl mx-auto">
      {/* 1. WELCOME HEADER */}
      <div className="border-4 border-black bg-brutal-yellow p-6 sm:p-8 shadow-brutal-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div>
              <div className="font-heading text-xs font-black uppercase tracking-widest text-neutral-800">
                COMMAND CENTER
              </div>
              <h1 className="font-heading text-2xl sm:text-4xl font-black uppercase text-black">
                HELLO, {user.name.toUpperCase()}!
              </h1>
              <p className="text-xs font-bold text-neutral-700 mt-0.5">
                @{user.username} • {user.college || user.location || "Student Builder"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/profile/${user.username}`}>
              <BrutalButton variant="white" size="sm">
                View My Profile
              </BrutalButton>
            </Link>
            <Link href="/discover">
              <BrutalButton variant="black" size="sm">
                <Compass className="w-4 h-4" />
                Discover
              </BrutalButton>
            </Link>
          </div>
        </div>

        {/* User Skills Badges */}
        <div className="mt-4 pt-4 border-t-2 border-black flex flex-wrap items-center gap-2">
          <span className="font-heading text-xs font-black uppercase text-black mr-2">
            Your Match Stack:
          </span>
          {userSkills.map((s: string, idx: number) => (
            <SkillTag key={idx} skill={s} size="sm" />
          ))}
        </div>
      </div>

      {/* 2. QUICK ACTIONS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/create/team" className="block">
          <button className="w-full border-4 border-black bg-brutal-yellow p-4 text-left font-heading shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-transform active:translate-x-0 active:translate-y-0">
            <div className="text-2xl font-black text-black">+ CREATE TEAM</div>
            <div className="text-xs font-bold text-neutral-700 mt-1">
              Have an upcoming event? Post missing spots (e.g. 3/4).
            </div>
          </button>
        </Link>

        <Link href="/create/orphan" className="block">
          <button className="w-full border-4 border-black bg-brutal-green p-4 text-left font-heading shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-transform active:translate-x-0 active:translate-y-0">
            <div className="text-2xl font-black text-black">+ LOOKING FOR TEAM</div>
            <div className="text-xs font-bold text-neutral-700 mt-1">
              Say you&apos;re available so teams can invite you.
            </div>
          </button>
        </Link>

        <Link href="/discover" className="block">
          <button className="w-full border-4 border-black bg-brutal-cyan p-4 text-left font-heading shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-transform active:translate-x-0 active:translate-y-0">
            <div className="text-2xl font-black text-black">🔍 BROWSE MARKET</div>
            <div className="text-xs font-bold text-neutral-700 mt-1">
              Explore hackathons, contests, and sports listings.
            </div>
          </button>
        </Link>
      </div>

      {/* 2b. INCOMING SQUAD APPLICATIONS */}
      {incomingRequests.length > 0 && (
        <IncomingRequestsManager initialRequests={incomingRequests} />
      )}

      {/* 3. YOUR CREATED TEAMS */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 stroke-[3] text-black" />
            <h2 className="font-heading text-2xl font-black uppercase text-black">
              YOUR CREATED TEAMS ({myTeams.length})
            </h2>
          </div>
          {totalPendingOnMyTeams > 0 && (
            <span className="border-2 border-black bg-brutal-pink text-white px-3 py-1 font-heading text-xs font-black uppercase animate-pulse shadow-[2px_2px_0px_#000]">
              🔥 {totalPendingOnMyTeams} PENDING JOIN REQUEST(S)
            </span>
          )}
        </div>

        {myTeams.length === 0 ? (
          <BrutalCard variant="muted" shadowSize="sm" className="text-center py-8 space-y-3">
            <Inbox className="w-10 h-10 mx-auto text-neutral-600 stroke-[2]" />
            <h3 className="font-heading text-lg font-black uppercase text-black">
              NO TEAMS CREATED YET
            </h3>
            <p className="text-xs font-bold text-neutral-600 max-w-sm mx-auto">
              If your squad is short a member for an upcoming event, create a listing now.
            </p>
            <Link href="/create/team" className="inline-block pt-2">
              <BrutalButton variant="yellow" size="sm">
                + Post Team Need
              </BrutalButton>
            </Link>
          </BrutalCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTeams.map((team: any) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>

      {/* 4. RECOMMENDED TEAMS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 stroke-[3] text-brutal-pink fill-current" />
            <h2 className="font-heading text-2xl font-black uppercase text-black">
              RECOMMENDED FOR YOUR SKILLS
            </h2>
          </div>
          <Link href="/discover?tab=teams">
            <span className="font-heading text-xs font-black uppercase text-neutral-700 hover:underline">
              See All Matches →
            </span>
          </Link>
        </div>

        {recommendedTeams.length === 0 ? (
          <p className="text-xs font-bold text-neutral-500">
            No recommended teams right now. Try updating your skills in profile!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedTeams.map(({ team, match }: any) => (
              <TeamCard key={team.id} team={team} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* 5. RECOMMENDED ORPHANS */}
      {myTeams.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-3 border-black pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 stroke-[3] text-brutal-green" />
              <h2 className="font-heading text-2xl font-black uppercase text-black">
                MATCHED ORPHANS FOR YOUR SQUADS
              </h2>
            </div>
            <Link href="/discover?tab=orphans">
              <span className="font-heading text-xs font-black uppercase text-neutral-700 hover:underline">
                Browse All Orphans →
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedOrphans.map(({ orphan, match }: any) => (
              <OrphanCard key={orphan.id} listing={orphan} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* 6. SENT REQUESTS */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-black uppercase text-black border-b-2 border-black pb-2">
          Your Sent Join Requests ({mySentRequests.length})
        </h2>

        {mySentRequests.length === 0 ? (
          <p className="text-xs font-semibold text-neutral-500">
            You haven&apos;t requested to join any teams yet.
          </p>
        ) : (
          <div className="space-y-3">
            {mySentRequests.map((req: any) => (
              <div
                key={req.id}
                className="border-2 border-black bg-white p-3 flex flex-wrap items-center justify-between gap-4 shadow-brutal-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-neutral-500">
                    {req.team.event?.name}
                  </div>
                  <div className="font-heading text-base font-black uppercase text-black">
                    {req.team.name}
                  </div>
                  {req.message && (
                    <div className="text-xs italic text-neutral-700 mt-0.5 line-clamp-1">
                      &ldquo;{req.message}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`border-2 border-black px-2.5 py-1 text-xs font-black uppercase ${
                      req.status === "PENDING"
                        ? "bg-brutal-yellow text-black"
                        : req.status === "ACCEPTED"
                        ? "bg-brutal-green text-black"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {req.status}
                  </span>
                  <Link href={`/teams/${req.team.id}`}>
                    <BrutalButton variant="white" size="sm">
                      View Team
                    </BrutalButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
