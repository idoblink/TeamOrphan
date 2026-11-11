import Link from "next/link";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { TeamCard } from "@/components/cards/TeamCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { calculateCompatibility } from "@/lib/matching";
import { syncDatabaseFromCookies } from "@/lib/cookie-sync";
import { Users, PlusCircle, Search, Flame } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface TeamsPageProps {
  searchParams: {
    category?: string;
    mode?: string;
    search?: string;
    urgency?: string;
  };
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  await tinydb.sync();
  const user = await getCurrentUser();
  const category = searchParams.category || "ALL";
  const mode = searchParams.mode || "ALL";
  const search = searchParams.search || "";
  const urgency = searchParams.urgency || "ALL";

  const rawTeams = tinydb.collection("teams").findMany().map((t: any) => {
    const event = tinydb.collection("events").findUnique((e: any) => e.id === t.eventId);
    const creator = tinydb.collection("users").findUnique((u: any) => u.id === t.creatorId);
    const members = tinydb.collection("teamMembers")
      .findMany((m: any) => m.teamId === t.id)
      .map((m: any) => {
        const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
        return { id: m.id, ...m, user: u ? { name: u.name, avatar: u.avatar } : null };
      });

    return {
      ...t,
      event,
      creator: creator ? { id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar } : null,
      members,
      _count: { members: members.length },
    };
  }).filter((t: any) => t.event !== null);

  let teams = rawTeams;
  if (category !== "ALL") teams = teams.filter((t: any) => t.event?.category === category);
  if (mode !== "ALL") teams = teams.filter((t: any) => t.event?.mode === mode);
  if (search) {
    const s = search.toLowerCase();
    teams = teams.filter(
      (t: any) =>
        t.name?.toLowerCase().includes(s) ||
        t.description?.toLowerCase().includes(s) ||
        t.requiredSkills?.toLowerCase().includes(s) ||
        t.event?.name?.toLowerCase().includes(s)
    );
  }

  if (urgency === "urgent") {
    const now = new Date().getTime();
    teams = teams.filter((t: any) => {
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
        {
          requiredSkills: team.requiredSkills,
          preferredSkills: team.preferredSkills,
          category: team.event.category,
          location: team.event.location,
          mode: team.event.mode,
        }
      );
    }
    return { team, match };
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

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      <div className="border-4 border-black bg-brutal-yellow p-6 sm:p-8 shadow-brutal-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-block border-2 border-black bg-white px-2 py-0.5 font-heading text-xs font-black uppercase mb-1 shadow-[2px_2px_0px_#000]">
              TEAM DIRECTORY
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
              ACTIVE SQUADS RECRUITING
            </h1>
            <p className="text-xs font-bold text-neutral-800 mt-1">
              Find an open squad that needs your exact skills before the 24-hour cutoff rule.
            </p>
          </div>

          <Link href="/create/team">
            <BrutalButton variant="black" size="md">
              <PlusCircle className="w-4 h-4" />
              + Create Team Requirement
            </BrutalButton>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <BrutalCard variant="white" shadowSize="md" className="space-y-4">
        <form method="GET" action="/teams" className="flex flex-wrap gap-2">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="urgency" value={urgency} />

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search team name, required skills (e.g. Python, React), event..."
              className="w-full border-3 border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold shadow-brutal outline-none"
            />
          </div>

          <BrutalButton type="submit" variant="yellow" size="md">
            Search
          </BrutalButton>

          {(search || category !== "ALL" || mode !== "ALL" || urgency !== "ALL") && (
            <Link href="/teams">
              <BrutalButton variant="white" size="md">
                Reset
              </BrutalButton>
            </Link>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/teams?category=${cat}&mode=${mode}&urgency=${urgency}&search=${encodeURIComponent(
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

          <Link
            href={`/teams?category=${category}&mode=${mode}&urgency=${
              urgency === "urgent" ? "ALL" : "urgent"
            }&search=${encodeURIComponent(search)}`}
            className={`border-2 border-black px-2.5 py-1 text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] ${
              urgency === "urgent"
                ? "bg-brutal-pink text-white"
                : "bg-white text-black hover:bg-pink-100"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 URGENT ONLY</span>
          </Link>
        </div>
      </BrutalCard>

      {/* Teams Grid */}
      {teamsWithMatches.length === 0 ? (
        <BrutalCard variant="muted" shadowSize="md" className="py-12 text-center space-y-3">
          <Users className="w-12 h-12 mx-auto text-black stroke-[2.5]" />
          <h3 className="font-heading text-xl font-black uppercase text-black">
            NO TEAMS FOUND
          </h3>
          <p className="text-xs font-bold text-neutral-600 max-w-sm mx-auto">
            Try adjusting your search criteria or post your own team need!
          </p>
          <div className="pt-2">
            <Link href="/create/team">
              <BrutalButton variant="yellow" size="sm">
                + Create Team
              </BrutalButton>
            </Link>
          </div>
        </BrutalCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamsWithMatches.map(({ team, match }: any) => (
            <TeamCard key={team.id} team={team} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
