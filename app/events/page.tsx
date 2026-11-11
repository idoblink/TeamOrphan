import Link from "next/link";
import { tinydb } from "@/lib/tinydb";
import { EventCard } from "@/components/cards/EventCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { Calendar, PlusCircle, Search } from "lucide-react";

export const dynamic = "force-dynamic";

interface EventsPageProps {
  searchParams: {
    category?: string;
    mode?: string;
    search?: string;
  };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await tinydb.sync();
  const category = searchParams.category || "ALL";
  const mode = searchParams.mode || "ALL";
  const search = searchParams.search || "";

  let rawEvents = tinydb.collection("events").findMany();

  if (category !== "ALL") rawEvents = rawEvents.filter((e: any) => e.category === category);
  if (mode !== "ALL") rawEvents = rawEvents.filter((e: any) => e.mode === mode);
  if (search) {
    const s = search.toLowerCase();
    rawEvents = rawEvents.filter(
      (e: any) =>
        e.name?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.location?.toLowerCase().includes(s)
    );
  }

  const events = rawEvents.map((event: any) => {
    const teamsCount = tinydb.collection("teams").count((t: any) => t.eventId === event.id);
    return { ...event, _count: { teams: teamsCount } };
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
      {/* Header */}
      <div className="border-4 border-black bg-brutal-cyan p-6 sm:p-8 shadow-brutal-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-block border-2 border-black bg-white px-2 py-0.5 font-heading text-xs font-black uppercase mb-1 shadow-[2px_2px_0px_#000]">
              EVENTS DIRECTORY
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
              UPCOMING EVENTS & HACKATHONS
            </h1>
            <p className="text-xs font-bold text-neutral-800 mt-1">
              Find events and connect with incomplete teams before their 24-hour cutoff window.
            </p>
          </div>

          <Link href="/create/team">
            <BrutalButton variant="black" size="md">
              <PlusCircle className="w-4 h-4" />
              + Create Team for Event
            </BrutalButton>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <BrutalCard variant="white" shadowSize="md" className="space-y-4">
        <form method="GET" action="/events" className="flex flex-wrap gap-2">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="mode" value={mode} />

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search event name, location, or organizers..."
              className="w-full border-3 border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold shadow-brutal outline-none"
            />
          </div>

          <BrutalButton type="submit" variant="yellow" size="md">
            Search
          </BrutalButton>

          {(search || category !== "ALL" || mode !== "ALL") && (
            <Link href="/events">
              <BrutalButton variant="white" size="md">
                Reset
              </BrutalButton>
            </Link>
          )}
        </form>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/events?category=${cat}&mode=${mode}&search=${encodeURIComponent(search)}`}
              className={`border-2 border-black px-2.5 py-1 text-xs font-black uppercase transition-transform shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 ${
                category === cat ? "bg-black text-white" : "bg-white text-black hover:bg-brutal-yellow"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </BrutalCard>

      {/* Event Cards Grid */}
      {events.length === 0 ? (
        <BrutalCard variant="muted" shadowSize="md" className="py-12 text-center space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-black stroke-[2.5]" />
          <h3 className="font-heading text-xl font-black uppercase text-black">
            NO EVENTS FOUND
          </h3>
          <p className="text-xs font-bold text-neutral-600 max-w-sm mx-auto">
            Try resetting your filters or search keywords.
          </p>
        </BrutalCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
