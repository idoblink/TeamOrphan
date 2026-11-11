import Link from "next/link";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { TeamCard } from "@/components/cards/TeamCard";
import { OrphanCard } from "@/components/cards/OrphanCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { calculateCompatibility } from "@/lib/matching";
import { syncDatabaseFromCookies } from "@/lib/cookie-sync";
import { Search, Filter, Flame, Users, Sparkles, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface DiscoverPageProps {
  searchParams: {
    tab?: string;
    search?: string;
    category?: string;
    mode?: string;
    urgency?: string;
    skill?: string;
  };
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  syncDatabaseFromCookies();
  const user = await getCurrentUser();
  const activeTab = searchParams.tab === "orphans" ? "orphans" : "teams";
  const search = searchParams.search || "";
  const category = searchParams.category || "ALL";
  const mode = searchParams.mode || "ALL";
  const urgency = searchParams.urgency || "ALL";
  const skill = searchParams.skill || "";

  // 1. Fetch and filter Teams
  let rawTeams = tinydb.collection("teams").findMany().map((team: any) => {
    const event = tinydb.collection("events").findUnique((e: any) => e.id === team.eventId);
    const creator = tinydb.collection("users").findUnique((u: any) => u.id === team.creatorId);
    const members = tinydb.collection("teamMembers")
      .findMany((m: any) => m.teamId === team.id)
      .map((m: any) => {
        const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
        return { id: m.id, ...m, user: u ? { name: u.name, avatar: u.avatar } : null };
      });
    return {
      ...team,
      event,
      creator: creator ? { id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar } : null,
      members,
      _count: { members: members.length },
    };
  }).filter((t: any) => t.event !== null);

  if (category !== "ALL") rawTeams = rawTeams.filter((t: any) => t.event?.category === category);
  if (mode !== "ALL") rawTeams = rawTeams.filter((t: any) => t.event?.mode === mode);
  if (skill) rawTeams = rawTeams.filter((t: any) => t.requiredSkills?.toLowerCase().includes(skill.toLowerCase()));
  if (search) {
    const s = search.toLowerCase();
    rawTeams = rawTeams.filter((t: any) =>
      t.name?.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s) ||
      t.requiredSkills?.toLowerCase().includes(s) ||
      t.event?.name?.toLowerCase().includes(s)
    );
  }

  let teams = rawTeams;
  if (urgency === "urgent") {
    const now = Date.now();
    teams = rawTeams.filter((t: any) => {
      const start = new Date(t.event.startDate).getTime();
      const cutoff = start - 24 * 60 * 60 * 1000;
      const remaining = cutoff - now;
      return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
    });
  }

  const teamsWithMatches = teams.map((team: any) => {
    let match = null;
    if (user) {
      match = calculateCompatibility(
        { skills: (user as any).skills, interests: (user as any).interests, location: (user as any).location },
        { requiredSkills: team.requiredSkills, preferredSkills: team.preferredSkills, category: team.event.category, location: team.event.location, mode: team.event.mode }
      );
    }
    return { team, match };
  });

  // 2. Fetch and filter Orphan Listings
  let rawOrphans = tinydb.collection("orphanListings")
    .findMany((o: any) => o.status === "ACTIVE")
    .map((o: any) => {
      const orphanUser = tinydb.collection("users").findUnique((u: any) => u.id === o.userId);
      const targetEvent = o.targetEventId ? tinydb.collection("events").findUnique((e: any) => e.id === o.targetEventId) : null;
      return {
        ...o,
        user: orphanUser ? {
          id: orphanUser.id,
          name: orphanUser.name,
          username: orphanUser.username,
          avatar: orphanUser.avatar,
          college: orphanUser.college,
          location: orphanUser.location,
          skills: orphanUser.skills,
          interests: orphanUser.interests,
        } : null,
        targetEvent,
      };
    });

  if (mode !== "ALL") rawOrphans = rawOrphans.filter((o: any) => o.mode === mode);
  if (skill) rawOrphans = rawOrphans.filter((o: any) => o.skills?.toLowerCase().includes(skill.toLowerCase()));
  if (category !== "ALL") rawOrphans = rawOrphans.filter((o: any) => o.targetCategory === category || o.targetEvent?.category === category);
  if (search) {
    const s = search.toLowerCase();
    rawOrphans = rawOrphans.filter((o: any) =>
      o.bio?.toLowerCase().includes(s) ||
      o.skills?.toLowerCase().includes(s) ||
      o.user?.name?.toLowerCase().includes(s) ||
      o.user?.college?.toLowerCase().includes(s) ||
      o.user?.location?.toLowerCase().includes(s)
    );
  }

  const orphansWithMatches = rawOrphans.map((orphan: any) => {
    let match = null;
    if (user) {
      match = calculateCompatibility(
        { skills: orphan.skills, interests: orphan.user?.interests || "[]", location: orphan.location || orphan.user?.location },
        { requiredSkills: (user as any).skills, category: category !== "ALL" ? category : "Hackathon" }
      );
    }
    return { orphan, match };
  });

  const categories = [
    "ALL",
    "Hackathon",
    "Coding Contest",
    "Sports",
    "Gaming",
    "Robotics",
    "College Fest",
    "Debate",
  ];

  const modes = ["ALL", "ONLINE", "OFFLINE", "HYBRID"];

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="border-4 border-black bg-white p-6 sm:p-8 shadow-brutal-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-block border-2 border-black bg-brutal-yellow px-2 py-0.5 font-heading text-xs font-black uppercase mb-1 shadow-[2px_2px_0px_#000]">
              MARKETPLACE & DISCOVERY
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
              FIND YOUR SQUAD
            </h1>
            <p className="text-xs font-bold text-neutral-600 mt-1">
              Browse teams recruiting members or individuals available to join.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/create/team">
              <BrutalButton variant="yellow" size="sm">
                + Create Team Request
              </BrutalButton>
            </Link>
            <Link href="/create/orphan">
              <BrutalButton variant="green" size="sm">
                + Looking For Team
              </BrutalButton>
            </Link>
          </div>
        </div>

        {/* Dual Mode Switch Tabs */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t-3 border-black">
          <Link
            href={`/discover?tab=teams&category=${category}&mode=${mode}&urgency=${urgency}&search=${encodeURIComponent(
              search
            )}`}
            className={`border-3 border-black py-3 text-center font-heading text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-brutal ${
              activeTab === "teams"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-yellow-100"
            }`}
          >
            👥 TEAMS LOOKING FOR PEOPLE ({teams.length})
          </Link>

          <Link
            href={`/discover?tab=orphans&category=${category}&mode=${mode}&urgency=${urgency}&search=${encodeURIComponent(
              search
            )}`}
            className={`border-3 border-black py-3 text-center font-heading text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-brutal ${
              activeTab === "orphans"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-green-100"
            }`}
          >
            ⚡ PEOPLE LOOKING FOR TEAMS ({rawOrphans.length})
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <BrutalCard variant="muted" shadowSize="md" className="space-y-4">
        {/* Search Bar */}
        <form method="GET" action="/discover" className="flex flex-wrap gap-2">
          <input type="hidden" name="tab" value={activeTab} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="urgency" value={urgency} />

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search events, skills (e.g. Python, React), colleges, cities..."
              className="w-full border-3 border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold shadow-brutal outline-none"
            />
          </div>

          <BrutalButton type="submit" variant="yellow" size="md">
            Search
          </BrutalButton>

          {(search || category !== "ALL" || mode !== "ALL" || urgency !== "ALL") && (
            <Link href={`/discover?tab=${activeTab}`}>
              <BrutalButton variant="white" size="md">
                Reset Filters
              </BrutalButton>
            </Link>
          )}
        </form>

        {/* Categories Pills */}
        <div className="space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-black">
            Event Category:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/discover?tab=${activeTab}&category=${cat}&mode=${mode}&urgency=${urgency}&search=${encodeURIComponent(
                  search
                )}`}
                className={`border-2 border-black px-2.5 py-1 text-xs font-black uppercase transition-transform shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 ${
                  category === cat
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-brutal-yellow"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        {/* Mode & Urgency Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-black/20 text-xs font-black uppercase">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-700">Participation Mode:</span>
            {modes.map((m) => (
              <Link
                key={m}
                href={`/discover?tab=${activeTab}&category=${category}&mode=${m}&urgency=${urgency}&search=${encodeURIComponent(
                  search
                )}`}
                className={`border border-black px-2 py-0.5 text-[11px] ${
                  mode === m ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                {m}
              </Link>
            ))}
          </div>

          {activeTab === "teams" && (
            <div className="flex items-center gap-2">
              <Link
                href={`/discover?tab=teams&category=${category}&mode=${mode}&urgency=${
                  urgency === "urgent" ? "ALL" : "urgent"
                }&search=${encodeURIComponent(search)}`}
                className={`border-2 border-black px-2.5 py-1 text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] ${
                  urgency === "urgent"
                    ? "bg-brutal-pink text-white"
                    : "bg-white text-black hover:bg-pink-100"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>🔥 URGENT ONLY (&lt;24H CUTOFF)</span>
              </Link>
            </div>
          )}
        </div>
      </BrutalCard>

      {/* Grid Content Results */}
      {activeTab === "teams" ? (
        teamsWithMatches.length === 0 ? (
          <BrutalCard variant="white" shadowSize="lg" className="py-14 text-center space-y-4">
            <Inbox className="w-12 h-12 mx-auto text-black stroke-[2.5]" />
            <h3 className="font-heading text-2xl font-black uppercase text-black">
              NO TEAMS FOUND.
            </h3>
            <p className="text-xs font-bold text-neutral-600 max-w-md mx-auto">
              Looks like no teams matched your current filters. Try changing your filters or create a new team request.
            </p>
            <div className="pt-2">
              <Link href="/create/team">
                <BrutalButton variant="yellow" size="md">
                  + CREATE A TEAM REQUEST
                </BrutalButton>
              </Link>
            </div>
          </BrutalCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamsWithMatches.map(({ team, match }) => (
              <TeamCard key={team.id} team={team as any} match={match} />
            ))}
          </div>
        )
      ) : orphansWithMatches.length === 0 ? (
        <BrutalCard variant="white" shadowSize="lg" className="py-14 text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-black stroke-[2.5]" />
          <h3 className="font-heading text-2xl font-black uppercase text-black">
            NO ORPHAN LISTINGS FOUND.
          </h3>
          <p className="text-xs font-bold text-neutral-600 max-w-md mx-auto">
            Try adjusting your search criteria or create your own profile stating you are looking for a team.
          </p>
          <div className="pt-2">
            <Link href="/create/orphan">
              <BrutalButton variant="green" size="md">
                + POST &ldquo;LOOKING FOR TEAM&rdquo;
              </BrutalButton>
            </Link>
          </div>
        </BrutalCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orphansWithMatches.map(({ orphan, match }) => (
            <OrphanCard key={orphan.id} listing={orphan as any} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
