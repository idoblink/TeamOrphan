import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { TeamCard } from "@/components/cards/TeamCard";
import { OrphanCard } from "@/components/cards/OrphanCard";
import { Countdown } from "@/components/ui/Countdown";
import { parseJsonArray } from "@/lib/utils";
import {
  Users,
  Zap,
  Clock,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Code,
  Trophy,
  Gamepad2,
  Bot,
  Sparkles,
  PlusCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let totalMemberships = 0;
  let totalActiveTeams = 0;
  let totalEvents = 0;
  let activeTeams: any[] = [];
  let activeOrphans: any[] = [];

  try {
    const [membershipsSnap, openTeamsSnap, eventsSnap] = await Promise.all([
      adminDb.collection("teamMembers").get(),
      adminDb.collection("teams").where("status", "==", "OPEN").get(),
      adminDb.collection("events").get(),
    ]);

    totalMemberships = membershipsSnap.size;
    totalActiveTeams = openTeamsSnap.size;
    totalEvents = eventsSnap.size;

    const activeTeamsRaw = openTeamsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    activeTeams = (
      await Promise.all(
        activeTeamsRaw.slice(0, 6).map(async (t) => {
          try {
            const eDoc = await adminDb.collection("events").doc(t.eventId).get();
            const eventData = eDoc.exists ? ({ id: eDoc.id, ...eDoc.data() } as any) : null;
            if (!eventData) return null;

            // Normalize startDate to Date object or ISO string for client components
            const startDate = eventData.startDate?.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);
            const event = { ...eventData, startDate };

            const cDoc = await adminDb.collection("users").doc(t.creatorId).get();
            const creator = cDoc.exists
              ? { id: cDoc.id, name: cDoc.data()!.name, username: cDoc.data()!.username, avatar: cDoc.data()!.avatar }
              : null;

            const membersSnap = await adminDb.collection("teamMembers").where("teamId", "==", t.id).get();
            const members = await Promise.all(
              membersSnap.docs.map(async (m) => {
                const md = m.data();
                const uDoc = await adminDb.collection("users").doc(md.userId).get();
                return {
                  id: m.id,
                  ...md,
                  user: uDoc.exists ? { name: uDoc.data()!.name, avatar: uDoc.data()!.avatar } : null,
                };
              })
            );

            return {
              ...t,
              event,
              creator,
              members,
              _count: { members: membersSnap.size },
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);

    const orphansSnap = await adminDb
      .collection("orphanListings")
      .where("status", "==", "ACTIVE")
      .limit(3)
      .get();

    activeOrphans = (
      await Promise.all(
        orphansSnap.docs.map(async (o) => {
          try {
            const od = { id: o.id, ...o.data() } as any;
            const uDoc = await adminDb.collection("users").doc(od.userId).get();
            const user = uDoc.exists
              ? {
                  id: uDoc.id,
                  name: uDoc.data()!.name,
                  username: uDoc.data()!.username,
                  avatar: uDoc.data()!.avatar,
                  college: uDoc.data()!.college,
                  location: uDoc.data()!.location,
                }
              : null;

            let targetEvent = null;
            if (od.targetEventId) {
              const eDoc = await adminDb.collection("events").doc(od.targetEventId).get();
              if (eDoc.exists) {
                const ed = eDoc.data()!;
                const startDate = ed.startDate?.toDate ? ed.startDate.toDate() : new Date(ed.startDate);
                targetEvent = { id: eDoc.id, ...ed, startDate };
              }
            }

            return {
              ...od,
              user,
              targetEvent,
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);
  } catch (err) {
    console.error("HomePage Firestore query error:", err);
  }

  // Featured urgent team for hero poster
  const featuredTeam = activeTeams[0] || null;
  const featuredSkills = featuredTeam ? parseJsonArray(featuredTeam.requiredSkills) : [];

  const categories = [
    { name: "Hackathons", icon: Code, color: "bg-brutal-yellow" },
    { name: "Coding Contests", icon: Zap, color: "bg-brutal-cyan" },
    { name: "Sports", icon: Trophy, color: "bg-brutal-green" },
    { name: "Gaming", icon: Gamepad2, color: "bg-brutal-purple" },
    { name: "Robotics", icon: Bot, color: "bg-brutal-pink" },
    { name: "College Fest", icon: Sparkles, color: "bg-brutal-orange" },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-6">
              {/* Urgent Floating Pill */}
              <div className="inline-flex items-center gap-2 border-3 border-black bg-brutal-yellow px-3.5 py-1.5 font-heading text-xs font-black uppercase tracking-wider shadow-brutal-sm">
                <Flame className="w-4 h-4 text-black animate-bounce fill-current" />
                <span>Event-Based Team Formation & Matching</span>
              </div>

              {/* Huge Neo-Brutalist Title */}
              <div className="space-y-2">
                <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-black leading-[0.9]">
                  YOUR TEAM IS <br />
                  <span className="bg-brutal-pink text-white px-2 py-0.5 border-4 border-black inline-block shadow-brutal rotate-[-1deg]">
                    SHORT A PERSON?
                  </span>
                  <br />
                  <span className="text-black underline decoration-wavy decoration-brutal-yellow">
                    FIND THEM.
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="font-medium text-lg sm:text-xl text-neutral-800 max-w-xl">
                Don&apos;t let your team compete one member short. Match with verified students and builders before the strict <strong className="bg-black text-white px-1">24-hour cutoff</strong>.
              </p>

              {/* CTA Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="/discover">
                  <BrutalButton variant="yellow" size="lg">
                    <span>FIND TEAMMATES NOW</span>
                    <ArrowRight className="w-5 h-5 ml-1 inline" />
                  </BrutalButton>
                </Link>
                <Link href="/create/team">
                  <BrutalButton variant="white" size="lg">
                    <span>+ POST YOUR SQUAD</span>
                  </BrutalButton>
                </Link>
              </div>

              {/* Micro Trust Proof */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-bold text-neutral-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
                  <span>Verified Cutoff Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-black stroke-[2.5]" />
                  <span>24-Hour Recruitment Freeze</span>
                </div>
              </div>
            </div>

            {/* Right Hero Poster (Urgent Spot Card) */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Decorative Background Offset Box */}
                <div className="absolute -inset-3 bg-black transform rotate-1 hidden sm:block"></div>

                <div className="relative border-4 border-black bg-white p-6 sm:p-8 shadow-brutal-xl space-y-6">
                  {/* Badge Row */}
                  <div className="flex items-center justify-between">
                    <span className="border-2 border-black bg-brutal-pink text-white font-heading px-3 py-1 text-xs font-black uppercase tracking-wider animate-pulse shadow-[2px_2px_0px_#000]">
                      🔥 LIVE RECRUITMENT
                    </span>
                    <span className="text-xs font-black uppercase text-neutral-600">
                      SPOT 3 OF 4 NEEDED
                    </span>
                  </div>

                  {/* Event Title Mockup */}
                  <div className="space-y-1">
                    <div className="text-xs font-black uppercase tracking-wider text-neutral-500">
                      {featuredTeam?.event?.category || "National Hackathon"}
                    </div>
                    <h3 className="font-heading text-2xl sm:text-3xl font-black uppercase text-black leading-tight">
                      {featuredTeam?.name || "Neural Ninjas Squad"}
                    </h3>
                    <p className="text-xs font-medium text-neutral-700 line-clamp-2">
                      {featuredTeam?.description ||
                        "Building an AI legal doc analyzer. Frontend and backend locked, urgently seeking ML / Python engineer before cutoff!"}
                    </p>
                  </div>

                  {/* Urgent Countdown */}
                  {featuredTeam?.event?.startDate && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-black">
                        Time Remaining Until Freeze:
                      </div>
                      <Countdown startDate={featuredTeam.event.startDate} variant="card" />
                    </div>
                  )}

                  {/* Missing Skills Tags */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
                      Required Stack to Qualify:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(featuredSkills.length > 0
                        ? featuredSkills
                        : ["Python", "FastAPI", "PyTorch", "React"]
                      ).map((skill: string, i: number) => (
                        <span
                          key={i}
                          className="border-2 border-black bg-brutal-yellow px-2 py-0.5 text-xs font-black uppercase shadow-[2px_2px_0px_#000]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Apply Action */}
                  <div className="pt-2">
                    <Link href={featuredTeam ? `/teams/${featuredTeam.id}` : "/discover"}>
                      <button className="w-full border-3 border-black bg-black py-3 text-center font-heading text-sm font-black uppercase tracking-wider text-white shadow-brutal hover:bg-neutral-800 transition-colors">
                        APPLY FOR THIS SPOT →
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE METRICS COUNTER BAR */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-4 border-black bg-brutal-yellow p-6 shadow-brutal">
              <div className="font-heading text-4xl sm:text-5xl font-black text-black">
                {totalActiveTeams}
              </div>
              <div className="font-heading text-xs font-black uppercase tracking-wider text-black mt-1">
                Active Open Squads
              </div>
            </div>

            <div className="border-4 border-black bg-brutal-cyan p-6 shadow-brutal">
              <div className="font-heading text-4xl sm:text-5xl font-black text-black">
                {totalMemberships}
              </div>
              <div className="font-heading text-xs font-black uppercase tracking-wider text-black mt-1">
                Teammates Placed
              </div>
            </div>

            <div className="border-4 border-black bg-brutal-pink p-6 shadow-brutal text-white">
              <div className="font-heading text-4xl sm:text-5xl font-black">24H</div>
              <div className="font-heading text-xs font-black uppercase tracking-wider mt-1">
                Cutoff Rule Enforced
              </div>
            </div>

            <div className="border-4 border-black bg-brutal-green p-6 shadow-brutal">
              <div className="font-heading text-4xl sm:text-5xl font-black text-black">
                {totalEvents}
              </div>
              <div className="font-heading text-xs font-black uppercase tracking-wider text-black mt-1">
                Events Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BROWSE BY EVENT DOMAIN CATEGORIES */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-4">
            <div>
              <span className="font-heading text-xs font-black uppercase tracking-widest text-neutral-600">
                DISCOVER OPPORTUNITIES
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black uppercase text-black">
                EXPLORE EVENT CATEGORIES
              </h2>
            </div>
            <Link href="/events" className="font-heading text-xs font-black uppercase hover:underline">
              All Events Directory →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((c, i) => {
              const Icon = c.icon;
              return (
                <Link
                  key={i}
                  href={`/discover?category=${encodeURIComponent(c.name)}`}
                  className="group block"
                >
                  <div
                    className={`border-3 border-black ${c.color} p-4 text-center shadow-brutal transition-transform hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0`}
                  >
                    <Icon className="w-8 h-8 mx-auto text-black stroke-[2.5] mb-2" />
                    <div className="font-heading text-xs font-black uppercase text-black tracking-tight leading-snug">
                      {c.name}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ACTIVE SQUADS RECRUITING NOW */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-4">
            <div>
              <span className="font-heading text-xs font-black uppercase tracking-widest text-brutal-pink">
                URGENT VACANCIES
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black uppercase text-black">
                SQUADS SEEKING PLAYERS
              </h2>
            </div>
            <Link href="/teams">
              <BrutalButton variant="white" size="sm">
                View All Squads ({totalActiveTeams})
              </BrutalButton>
            </Link>
          </div>

          {activeTeams.length === 0 ? (
            <BrutalCard variant="muted" shadowSize="md" className="py-12 text-center space-y-3">
              <Users className="w-12 h-12 mx-auto text-black stroke-[2.5]" />
              <h3 className="font-heading text-xl font-black uppercase text-black">
                NO TEAMS RECRUITING RIGHT NOW
              </h3>
              <p className="text-xs font-bold text-neutral-600 max-w-sm mx-auto">
                Be the first to post a team opening and lock in your teammates!
              </p>
              <Link href="/create/team" className="inline-block pt-2">
                <BrutalButton variant="yellow" size="sm">
                  + Create Team Listing
                </BrutalButton>
              </Link>
            </BrutalCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTeams.map((team) => (
                <TeamCard key={team.id} team={team as any} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. 24-HOUR PROTOCOL EXPLAINER BANNER */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-4 border-black bg-black text-white p-8 sm:p-12 shadow-brutal-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-block border-2 border-brutal-yellow bg-brutal-yellow text-black font-heading text-xs font-black uppercase px-2.5 py-0.5">
                  THE RULE OF LAW
                </span>
                <h2 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  THE 24-HOUR RECRUITMENT FREEZE PROTOCOL
                </h2>
                <p className="text-neutral-300 font-medium text-sm sm:text-base max-w-2xl">
                  Every event locks recruitment exactly <strong className="text-brutal-yellow">24 hours</strong> before kickoff. Once the clock runs out, server-side transactions reject join requests automatically.
                </p>
              </div>

              <div className="lg:col-span-4 border-3 border-white bg-neutral-900 p-6 space-y-3">
                <div className="flex items-center gap-2 text-brutal-yellow font-heading text-sm font-black uppercase">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>How It Enforces:</span>
                </div>
                <ul className="text-xs font-bold text-neutral-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-brutal-green font-black">✓</span>
                    Server rejects join requests post-cutoff
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brutal-green font-black">✓</span>
                    Urgency countdown pulses at &lt;24 hours
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brutal-green font-black">✓</span>
                    Listing automatically closes at full roster
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INDIVIDUALS LOOKING FOR SQUADS */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-4">
            <div>
              <span className="font-heading text-xs font-black uppercase tracking-widest text-brutal-green">
                TALENT BENCH
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black uppercase text-black">
                FREE AGENTS READY TO COMPETE
              </h2>
            </div>
            <Link href="/discover?tab=orphans">
              <BrutalButton variant="white" size="sm">
                Browse All Builders →
              </BrutalButton>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeOrphans.map((orphan) => (
              <OrphanCard key={orphan.id} listing={orphan as any} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS 3-STEP SECTION */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center space-y-2">
            <span className="font-heading text-xs font-black uppercase tracking-widest text-neutral-600">
              SIMPLE 3-STEP SYSTEM
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-black uppercase text-black">
              HOW TEAMSYNC WORKS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-4 border-black bg-white p-6 shadow-brutal space-y-4">
              <div className="border-3 border-black bg-brutal-yellow w-12 h-12 flex items-center justify-center font-heading text-2xl font-black text-black shadow-brutal-sm">
                01
              </div>
              <h3 className="font-heading text-xl font-black uppercase text-black">
                POST OR BROWSE OPENINGS
              </h3>
              <p className="text-xs font-medium text-neutral-700">
                Squads list exact skill requirements. Free agents post skill profiles and availability.
              </p>
            </div>

            <div className="border-4 border-black bg-white p-6 shadow-brutal space-y-4">
              <div className="border-3 border-black bg-brutal-pink w-12 h-12 flex items-center justify-center font-heading text-2xl font-black text-white shadow-brutal-sm">
                02
              </div>
              <h3 className="font-heading text-xl font-black uppercase text-black">
                COMPATIBILITY MATCHING
              </h3>
              <p className="text-xs font-medium text-neutral-700">
                Our engine scores candidates from 0 to 100% based on skills, domain, mode, and availability.
              </p>
            </div>

            <div className="border-4 border-black bg-white p-6 shadow-brutal space-y-4">
              <div className="border-3 border-black bg-brutal-green w-12 h-12 flex items-center justify-center font-heading text-2xl font-black text-black shadow-brutal-sm">
                03
              </div>
              <h3 className="font-heading text-xl font-black uppercase text-black">
                ACCEPT & LOCK ROSTER
              </h3>
              <p className="text-xs font-medium text-neutral-700">
                Accept members with one click before the 24-hour freeze window closes. Go win together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BOTTOM CALL TO ACTION */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-4 border-black bg-brutal-yellow p-8 sm:p-14 text-center space-y-6 shadow-brutal-xl">
            <h2 className="font-heading text-3xl sm:text-6xl font-black uppercase tracking-tight text-black max-w-2xl mx-auto leading-tight">
              NEVER COMPETE DOWN A MEMBER AGAIN.
            </h2>
            <p className="text-sm sm:text-base font-bold text-neutral-800 max-w-xl mx-auto">
              Join thousands of hackathon participants, competitive programmers, and sports builders.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/register">
                <BrutalButton variant="black" size="lg">
                  <span>CREATE FREE ACCOUNT</span>
                  <ArrowRight className="w-5 h-5 ml-1 inline" />
                </BrutalButton>
              </Link>
              <Link href="/discover">
                <BrutalButton variant="white" size="lg">
                  EXPLORE MARKETPLACE
                </BrutalButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
