import { notFound } from "next/navigation";
import Link from "next/link";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { TeamCard } from "@/components/cards/TeamCard";
import { OrphanCard } from "@/components/cards/OrphanCard";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { Countdown } from "@/components/ui/Countdown";
import { formatDate, getCategoryColor } from "@/lib/utils";
import { Calendar, MapPin, Users, PlusCircle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const event = tinydb.collection("events").findUnique((e: any) => e.id === params.id);
  if (!event) notFound();

  const teams = tinydb.collection("teams")
    .findMany((t: any) => t.eventId === params.id)
    .map((t: any) => {
      const creator = tinydb.collection("users").findUnique((u: any) => u.id === t.creatorId);
      const members = tinydb.collection("teamMembers")
        .findMany((m: any) => m.teamId === t.id)
        .map((m: any) => {
          const u = tinydb.collection("users").findUnique((usr: any) => usr.id === m.userId);
          return { id: m.id, ...m, user: u ? { name: u.name, avatar: u.avatar } : null };
        });
      return { ...t, creator, members, event, _count: { members: members.length } };
    });

  const orphanListings = tinydb.collection("orphanListings")
    .findMany((o: any) => o.targetEventId === params.id && o.status === "ACTIVE")
    .map((o: any) => {
      const u = tinydb.collection("users").findUnique((usr: any) => usr.id === o.userId);
      return { ...o, targetEvent: event, user: u };
    });

  const catStyle = getCategoryColor(event.category);

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
      {/* Event Header Card */}
      <div className="border-4 border-black bg-white p-6 sm:p-10 shadow-brutal-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}
            >
              {event.category}
            </span>
            <span className="border-2 border-black bg-neutral-100 px-2.5 py-1 text-xs font-black uppercase">
              {event.mode}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/create/team?eventId=${event.id}`}>
              <BrutalButton variant="yellow" size="sm">
                + Create Team for This Event
              </BrutalButton>
            </Link>
            <Link href={`/create/orphan?eventId=${event.id}`}>
              <BrutalButton variant="green" size="sm">
                + Post &ldquo;Looking for Team&rdquo;
              </BrutalButton>
            </Link>
          </div>
        </div>

        <div>
          <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
            {event.name}
          </h1>
          <p className="mt-3 text-sm sm:text-base font-medium text-neutral-800 max-w-3xl">
            {event.description}
          </p>
        </div>

        {/* Meta Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y-3 border-black py-4 text-xs font-black uppercase">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-black" />
            <div>
              <div className="text-[10px] text-neutral-500">EVENT DATE & TIME</div>
              <div>{formatDate(event.startDate)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-black" />
            <div>
              <div className="text-[10px] text-neutral-500">VENUE LOCATION</div>
              <div>{event.location}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-black" />
            <div>
              <div className="text-[10px] text-neutral-500">ACTIVE SQUADS</div>
              <div>{teams.length} Teams Competing</div>
            </div>
          </div>
        </div>

        {/* Countdown Banner */}
        <Countdown startDate={event.startDate} variant="banner" showDetails />
      </div>

      {/* Teams In This Event */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 stroke-[3] text-black" />
            <h2 className="font-heading text-2xl font-black uppercase text-black">
              TEAMS IN THIS EVENT ({teams.length})
            </h2>
          </div>
          <Link href={`/create/team?eventId=${event.id}`}>
            <BrutalButton variant="white" size="sm">
              + Post New Team
            </BrutalButton>
          </Link>
        </div>

        {teams.length === 0 ? (
          <BrutalCard variant="muted" shadowSize="sm" className="text-center py-10 space-y-3">
            <h3 className="font-heading text-lg font-black uppercase text-black">
              NO TEAMS REGISTERED YET
            </h3>
            <p className="text-xs font-bold text-neutral-600">
              Be the first team leader to post a requirement for this event!
            </p>
            <Link href={`/create/team?eventId=${event.id}`} className="inline-block pt-2">
              <BrutalButton variant="yellow" size="sm">
                + Create First Team
              </BrutalButton>
            </Link>
          </BrutalCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team: any) => (
              <TeamCard key={team.id} team={{ ...team, event }} />
            ))}
          </div>
        )}
      </div>

      {/* Orphans Looking For This Event */}
      {orphanListings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b-3 border-black pb-3">
            <Sparkles className="w-6 h-6 stroke-[3] text-brutal-green" />
            <h2 className="font-heading text-2xl font-black uppercase text-black">
              INDIVIDUALS LOOKING TO JOIN THIS EVENT ({orphanListings.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orphanListings.map((orphan: any) => (
              <OrphanCard
                key={orphan.id}
                listing={{ ...orphan, targetEvent: event }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
