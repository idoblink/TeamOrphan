import { redirect } from "next/navigation";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { TeamCard } from "@/components/cards/TeamCard";
import { OrphanCard } from "@/components/cards/OrphanCard";
import { EventCard } from "@/components/cards/EventCard";
import { Avatar } from "@/components/ui/Avatar";
import { SkillTag } from "@/components/ui/SkillTag";
import { calculateCompatibility } from "@/lib/matching";
import { parseJsonArray } from "@/lib/utils";
import {
  PlusCircle,
  Search,
  Users,
  Compass,
  Zap,
  Flame,
  Clock,
  Sparkles,
  Inbox,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const u = user as any;
  const userSkills = parseJsonArray(u.skills);

  // 1. My created teams
  const myTeamsSnap = await adminDb.collection("teams").where("creatorId", "==", u.id).orderBy("createdAt", "desc").get();
  const myTeams = await Promise.all(
    myTeamsSnap.docs.map(async (t) => {
      const td = { id: t.id, ...t.data() } as any;
      const eDoc = await adminDb.collection("events").doc(td.eventId).get();
      const event = eDoc.exists ? { id: eDoc.id, ...eDoc.data() } : null;
      const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", t.id).get();
      const members = await Promise.all(membersSnap.docs.map(async (m) => {
        const md = m.data();
        const uDoc = await adminDb.collection("users").doc(md.userId).get();
        return { id: m.id, ...md, user: uDoc.exists ? { id: uDoc.id, name: uDoc.data()!.name, avatar: uDoc.data()!.avatar } : null };
      }));
      const jrSnap = await adminDb.collection("joinRequests").where("teamId", "==", t.id).where("status", "==", "PENDING").get();
      const joinRequests = jrSnap.docs.map((jr) => ({ id: jr.id, ...jr.data() }));
      return { ...td, event, members, joinRequests, _count: { members: membersSnap.size, joinRequests: jrSnap.size } };
    })
  );

  // 2. Teams where user is a member (not leader)
  const membershipSnap = await adminDb.collection("teamMembers").where("userId", "==", u.id).get();
  const memberTeamIds = membershipSnap.docs.map((d) => d.data().teamId);
  const rawMemberTeams = await Promise.all(
    memberTeamIds.map(async (teamId) => {
      const tDoc = await adminDb.collection("teams").doc(teamId).get();
      if (!tDoc.exists) return null;
      const td = { id: tDoc.id, ...tDoc.data() } as any;
      if (td.creatorId === u.id) return null; // skip own teams
      const eDoc = await adminDb.collection("events").doc(td.eventId).get();
      const event = eDoc.exists ? { id: eDoc.id, ...eDoc.data() } : null;
      const cDoc = await adminDb.collection("users").doc(td.creatorId).get();
      const creator = cDoc.exists ? { id: cDoc.id, name: cDoc.data()!.name, avatar: cDoc.data()!.avatar } : null;
      const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", teamId).get();
      const members = membersSnap.docs.map((m) => ({ id: m.id, ...m.data() }));
      return { ...td, event, creator, members, _count: { members: membersSnap.size } };
    })
  );
  const memberTeams = rawMemberTeams.filter(Boolean);

  // 3. My orphan listings
  const myOrphanSnap = await adminDb.collection("orphanListings").where("userId", "==", u.id).orderBy("createdAt", "desc").get();
  const myOrphanListings = await Promise.all(
    myOrphanSnap.docs.map(async (o) => {
      const od = { id: o.id, ...o.data() } as any;
      let targetEvent = null;
      if (od.targetEventId) {
        const eDoc = await adminDb.collection("events").doc(od.targetEventId).get();
        if (eDoc.exists) targetEvent = { id: eDoc.id, ...eDoc.data() };
      }
      return { ...od, targetEvent };
    })
  );

  // 4. My sent join requests
  const jrSnap = await adminDb.collection("joinRequests").where("userId", "==", u.id).orderBy("createdAt", "desc").get();
  const rawSentRequests = await Promise.all(
    jrSnap.docs.map(async (jr) => {
      const jrd = { id: jr.id, ...jr.data() } as any;
      const tDoc = await adminDb.collection("teams").doc(jrd.teamId).get();
      if (!tDoc.exists) return null;
      const td = tDoc.data()!;
      const eDoc = await adminDb.collection("events").doc(td.eventId).get();
      const event = eDoc.exists ? { id: eDoc.id, ...eDoc.data() } : null;
      const cDoc = await adminDb.collection("users").doc(td.creatorId).get();
      const creator = cDoc.exists ? { id: cDoc.id, name: cDoc.data()!.name, username: cDoc.data()!.username } : null;
      return { ...jrd, team: { id: tDoc.id, ...td, event, creator } };
    })
  );
  const mySentRequests = rawSentRequests.filter(Boolean);

  // 5. Recommended teams
  const openTeamsSnap = await adminDb.collection("teams").where("status", "==", "OPEN").get();
  const openTeams = await Promise.all(
    openTeamsSnap.docs.slice(0, 20).map(async (t) => {
      const td = { id: t.id, ...t.data() } as any;
      if (td.creatorId === u.id) return null;
      const memberSnap = await adminDb.collection("teamMembers").where("teamId", "==", t.id).where("userId", "==", u.id).limit(1).get();
      if (!memberSnap.empty) return null;
      const eDoc = await adminDb.collection("events").doc(td.eventId).get();
      const event = eDoc.exists ? { id: eDoc.id, ...eDoc.data() } : null;
      if (!event) return null;
      const cDoc = await adminDb.collection("users").doc(td.creatorId).get();
      const creator = cDoc.exists ? { id: cDoc.id, name: cDoc.data()!.name, username: cDoc.data()!.username, avatar: cDoc.data()!.avatar } : null;
      const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", t.id).get();
      const members = membersSnap.docs.map((m) => ({ id: m.id, ...m.data() }));
      return { ...td, event, creator, members, _count: { members: membersSnap.size } };
    })
  );
  const eligibleTeams = openTeams.filter(Boolean) as any[];

  const recommendedTeams = eligibleTeams
    .map((team) => {
      const match = calculateCompatibility(
        { skills: u.skills, interests: u.interests, location: u.location },
        { requiredSkills: team.requiredSkills, preferredSkills: team.preferredSkills, category: team.event.category, location: team.event.location, mode: team.event.mode }
      );
      return { team, match };
    })
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3);

  // 6. Recommended orphans for user's teams
  const activeOrphansSnap = await adminDb.collection("orphanListings").where("status", "==", "ACTIVE").get();
  const activeOrphans = await Promise.all(
    activeOrphansSnap.docs.slice(0, 20).map(async (o) => {
      const od = { id: o.id, ...o.data() } as any;
      if (od.userId === u.id) return null;
      const uDoc = await adminDb.collection("users").doc(od.userId).get();
      const orphanUser = uDoc.exists ? { id: uDoc.id, name: uDoc.data()!.name, username: uDoc.data()!.username, avatar: uDoc.data()!.avatar, college: uDoc.data()!.college, location: uDoc.data()!.location, skills: uDoc.data()!.skills, interests: uDoc.data()!.interests } : null;
      let targetEvent = null;
      if (od.targetEventId) {
        const eDoc = await adminDb.collection("events").doc(od.targetEventId).get();
        if (eDoc.exists) targetEvent = { id: eDoc.id, ...eDoc.data() };
      }
      return { ...od, user: orphanUser, targetEvent };
    })
  );
  const filteredOrphans = activeOrphans.filter(Boolean) as any[];

  const recommendedOrphans = filteredOrphans
    .map((orphan) => {
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
    .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
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
          {userSkills.map((s, idx) => (
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

      {/* 3. YOUR CREATED TEAMS & INCOMING REQUESTS */}
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
            {myTeams.map((team) => (
              <TeamCard key={team.id} team={team as any} />
            ))}
          </div>
        )}
      </div>

      {/* 4. RECOMMENDED TEAMS MATCHED FOR YOU */}
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
            {recommendedTeams.map(({ team, match }) => (
              <TeamCard key={team.id} team={team as any} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* 5. RECOMMENDED CANDIDATES / ORPHANS FOR YOU */}
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
            {recommendedOrphans.map(({ orphan, match }) => (
              <OrphanCard key={orphan.id} listing={orphan as any} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* 6. YOUR SENT JOIN REQUESTS */}
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
            {mySentRequests.map((req) => (
              <div
                key={req.id}
                className="border-2 border-black bg-white p-3 flex flex-wrap items-center justify-between gap-4 shadow-brutal-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-neutral-500">
                    {req.team.event.name}
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
