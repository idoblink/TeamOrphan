import { NextRequest, NextResponse } from "next/server";
import { db, Schema } from "@/lib/redis";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const CITIES = ["Bangalore", "Mysore", "Hyderabad", "Mumbai", "Pune", "Delhi NCR", "Chennai", "Remote"];
const COLLEGES = [
  "RV College of Engineering",
  "BMS College of Engineering",
  "PES University",
  "IIT Bangalore",
  "NIT Karnataka Surathkal",
  "NIE Mysore",
  "IIT Madras",
  "BITS Pilani",
  "Delhi Technological University",
  "VJTI Mumbai"
];

const SKILL_POOL = [
  "Python", "React", "Next.js", "TypeScript", "Node.js", "PyTorch", "TensorFlow", "FastAPI",
  "Solidity", "Rust", "Go", "Docker", "Kubernetes", "AWS", "Flutter", "Swift", "Kotlin",
  "Computer Vision", "NLP", "C++", "Java", "SQL", "TailwindCSS", "Figma", "UI/UX Design",
  "Cybersecurity", "Embedded Systems", "ROS", "Drone Navigation", "Unity", "Unreal Engine"
];

const FIRST_NAMES = [
  "Aarav", "Aditi", "Rohan", "Ananya", "Vikram", "Pooja", "Rahul", "Sneha", "Karan", "Priya",
  "Arjun", "Kavya", "Siddharth", "Neha", "Varun", "Rhea", "Nikhil", "Divya", "Aditya", "Tanvi",
  "Ishaan", "Meera", "Kabir", "Tara", "Ayush", "Simran", "Dhruv", "Isha", "Manish", "Shreya",
  "Harsh", "Deepika", "Pranav", "Anjali", "Gaurav", "Swati", "Abhishek", "Ritu", "Akash", "Roshni",
  "Dev", "Kriti", "Samarth", "Pallavi", "Tushar", "Vidya", "Naveen", "Bhavna", "Kunal", "Maya"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Nair", "Rao", "Iyer", "Reddy", "Gupta", "Deshmukh", "Kulkarni",
  "Menon", "Bhat", "Hegde", "Joshi", "Kapoor", "Malhotra", "Mehta", "Bansal", "Chopra", "Saxena"
];

const eventsData = [
  { name: "CodeVerse 2026 National Hackathon", cat: "Hackathon", mode: "HYBRID", loc: "Bangalore & Online", days: 7, desc: "India's premier 48-hour student hackathon focusing on AI agents, fintech, and web3 innovation." },
  { name: "RoboWars 2026 Arena Tournament", cat: "Robotics", mode: "OFFLINE", loc: "Mysore Exhibition Grounds", days: 14, desc: "Heavyweight battle bots and autonomous drone obstacle navigation championship." },
  { name: "Global AI & Web3 Sprint 2026", cat: "Coding Contest", mode: "ONLINE", loc: "Online", days: 10, desc: "Collegiate sprint to build open-source decentralized agent frameworks and full-stack solutions." },
  { name: "GameCraft India 2026 Game Jam", cat: "Gaming", mode: "ONLINE", loc: "Online Discord", days: 12, desc: "36-hour rapid game development jam built with Godot, Unreal Engine 5, and Unity." },
  { name: "Inter-Collegiate Esports Championship 2026", cat: "Gaming", mode: "HYBRID", loc: "Bangalore Indoor Stadium", days: 20, desc: "5v5 competitive tactical shooter and strategy tournament across 60+ colleges." },
  { name: "Karnataka Collegiate Cricket Trophy 2026", cat: "Sports", mode: "OFFLINE", loc: "Chinnaswamy Practice Grounds", days: 18, desc: "Annual T20 inter-college cricket tournament with teams competing for the state trophy." },
  { name: "CyberShield National CTF Challenge", cat: "Coding Contest", mode: "ONLINE", loc: "Online Platform", days: 5, desc: "Jeopardy-style offensive and defensive cybersecurity capture-the-flag competition." },
  { name: "Smart Mobility & Autonomous EV Challenge", cat: "Robotics", mode: "OFFLINE", loc: "PES Tech Campus", days: 25, desc: "Hardware and sensor-fusion challenge to build scale autonomous campus shuttles." },
  { name: "National Parliamentary Debate Cup 2026", cat: "Debate", mode: "OFFLINE", loc: "National Law School Bangalore", days: 9, desc: "3-day British Parliamentary debate addressing international economics, tech ethics, and law." },
  { name: "FinTech Agentic Revolution Sprint", cat: "Hackathon", mode: "HYBRID", loc: "Indiranagar Tech Hub", days: 15, desc: "Build agentic micro-payment flows, credit-scoring agents, and fraud-detection models." },
  { name: "Pulse 2026 Mega Cultural Fest", cat: "College Fest", mode: "OFFLINE", loc: "BMS Engineering Arena", days: 30, desc: "Annual inter-college fest with tech competitions, battle of bands, dance, and design sprints." },
  { name: "OpenHealth AI Healthcare Hackathon", cat: "Hackathon", mode: "ONLINE", loc: "Online", days: 11, desc: "Create assistive AI diagnostic tooling, EHR voice agents, and triage systems for rural clinics." },
  { name: "AgriTech Innovation Challenge 2026", cat: "Hackathon", mode: "HYBRID", loc: "University of Agricultural Sciences", days: 22, desc: "Computer vision crop disease detection, IoT soil sensors, and farm-to-table logistics." },
  { name: "Apex Design & UX Sprint 2026", cat: "Design Sprint", mode: "ONLINE", loc: "Figma Community & Online", days: 6, desc: "Rapid 24-hour design sprint solving accessibility and brutalist product interfaces." },
  { name: "RoboCup Autonomous Drone Soccer", cat: "Robotics", mode: "OFFLINE", loc: "NITK Surathkal Sports Complex", days: 28, desc: "High-speed multi-rotor drone soccer match inside an electrified netted cage." },
  { name: "All-India Inter-University Football Shield", cat: "Sports", mode: "OFFLINE", loc: "Bangalore Football Stadium", days: 16, desc: "11-a-side collegiate football tournament featuring the top 32 varsity squads." },
  { name: "CleanTech & Green Energy Hackathon", cat: "Hackathon", mode: "HYBRID", loc: "IIT Madras Research Park", days: 19, desc: "Carbon footprint tracking software, smart microgrids, and battery management systems." }
];

const TEAM_PREFIXES = [
  "Neural", "Cyber", "Quantum", "Agentic", "Apex", "Binary", "Hyper", "Vortex",
  "Titan", "Nexus", "Vector", "Pulse", "Synthetix", "ZeroG", "Omni", "Turbo"
];
const TEAM_SUFFIXES = [
  "Ninjas", "Sparks", "Builders", "Hacks", "Syndicate", "Squad", "Labs", "Protocol",
  "Pioneers", "Collective", "Warriors", "Alliance", "Foundry", "Engineers"
];

async function runSeed() {
  await db.sync(true);
  const now = Date.now();

  // 1. Events
  const events = eventsData.map((e, idx) => ({
    id: `eve_${1000 + idx}`,
    name: e.name,
    category: e.cat,
    mode: e.mode,
    location: e.loc,
    startDate: new Date(now + e.days * 24 * 60 * 60 * 1000).toISOString(),
    description: e.desc,
    createdById: null,
    createdAt: new Date(now - (idx + 1) * 3600000).toISOString(),
    updatedAt: new Date(now - (idx + 1) * 3600000).toISOString(),
  }));

  // 2. 100 Users
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const users: any[] = [];

  // Preserve existing users (e.g. Dhanush) if already registered
  const existingUsers = db.collection("users").findMany();
  for (const eu of existingUsers) {
    if (eu.username === "dhanush1" || eu.email?.includes("dhanush")) {
      users.push(eu);
    }
  }

  const needed = 100 - users.length;
  for (let i = 0; i < needed; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const username = `${fn.toLowerCase()}_${ln.toLowerCase()}${i >= 50 ? i : ""}`;
    const email = `${username}@collegiate.edu`;

    const userSkills: string[] = [];
    const skillCount = 3 + (i % 3);
    for (let s = 0; s < skillCount; s++) {
      const sk = SKILL_POOL[(i * 3 + s) % SKILL_POOL.length];
      if (!userSkills.includes(sk)) userSkills.push(sk);
    }

    const city = CITIES[i % CITIES.length];
    const college = COLLEGES[i % COLLEGES.length];

    users.push({
      id: `usr_${1000 + i}`,
      name: fullName,
      username,
      email,
      passwordHash,
      role: i === 0 ? "ADMIN" : "USER",
      avatar: null,
      bio: `Building next-gen systems at ${college}. Passionate about ${userSkills.slice(0, 2).join(" & ")}.`,
      college,
      location: city,
      skills: JSON.stringify(userSkills),
      interests: JSON.stringify(["Hackathons", "Open Source", "AI Agents", "Competitions"]),
      isSuspended: false,
      createdAt: new Date(now - (100 - i) * 7200000).toISOString(),
      updatedAt: new Date(now - (100 - i) * 7200000).toISOString(),
    });
  }

  // 3. 30 Teams
  const teams: any[] = [];
  const teamMembers: any[] = [];
  const joinRequests: any[] = [];
  const notifications: any[] = [];
  const messages: any[] = [];
  const orphanListings: any[] = [];

  for (let t = 0; t < 30; t++) {
    const pfx = TEAM_PREFIXES[t % TEAM_PREFIXES.length];
    const sfx = TEAM_SUFFIXES[(t * 2) % TEAM_SUFFIXES.length];
    const teamName = `${pfx} ${sfx}`;
    const targetEvent = events[t % events.length];
    const leaderUser = users[t];
    const maxMembers = 3 + (t % 3);

    const req = [SKILL_POOL[t % SKILL_POOL.length], SKILL_POOL[(t + 4) % SKILL_POOL.length]];
    const pref = [SKILL_POOL[(t + 8) % SKILL_POOL.length]];

    const teamId = `tea_${2000 + t}`;
    const team = {
      id: teamId,
      name: teamName,
      eventId: targetEvent.id,
      creatorId: leaderUser.id,
      maxMembers,
      description: `We are a passionate squad from ${leaderUser.college} targeting a podium finish in ${targetEvent.name}. Looking for skilled teammates!`,
      requiredSkills: JSON.stringify(req),
      preferredSkills: JSON.stringify(pref),
      contactInfo: `@${leaderUser.username} on Discord`,
      status: "OPEN",
      createdAt: new Date(now - (30 - t) * 10800000).toISOString(),
      updatedAt: new Date(now - (30 - t) * 10800000).toISOString(),
    };
    teams.push(team);

    // Leader is member
    teamMembers.push({
      id: `tm_${3000 + t * 5}`,
      teamId,
      userId: leaderUser.id,
      role: "LEADER",
      createdAt: team.createdAt,
      updatedAt: team.createdAt,
    });

    // 1-2 extra members
    const existingMemberCount = 1 + (t % 2);
    for (let m = 0; m < existingMemberCount; m++) {
      const memberUser = users[30 + ((t * 2 + m) % 30)];
      teamMembers.push({
        id: `tm_${3000 + t * 5 + m + 1}`,
        teamId,
        userId: memberUser.id,
        role: "MEMBER",
        createdAt: new Date(new Date(team.createdAt).getTime() + (m + 1) * 3600000).toISOString(),
        updatedAt: new Date(new Date(team.createdAt).getTime() + (m + 1) * 3600000).toISOString(),
      });
    }

    // Join requests
    if (t < 25) {
      const applicantUser = users[60 + (t % 30)];
      joinRequests.push({
        id: `joi_${4000 + t}`,
        teamId,
        userId: applicantUser.id,
        message: `Hello ${leaderUser.name}! I would love to contribute my experience in ${req[0]} to ${teamName}.`,
        status: "PENDING",
        createdAt: new Date(now - (25 - t) * 1800000).toISOString(),
        updatedAt: new Date(now - (25 - t) * 1800000).toISOString(),
      });

      notifications.push({
        id: `not_${5000 + t}`,
        userId: leaderUser.id,
        type: "JOIN_REQUEST",
        title: `New Join Request: ${teamName}`,
        message: `${applicantUser.name} requested to join ${teamName} for ${targetEvent.name}.`,
        link: `/teams/${teamId}`,
        read: false,
        createdAt: new Date(now - (25 - t) * 1800000).toISOString(),
        updatedAt: new Date(now - (25 - t) * 1800000).toISOString(),
      });

      messages.push({
        id: `msg_${6000 + t * 2}`,
        senderId: applicantUser.id,
        receiverId: leaderUser.id,
        content: `Hey ${leaderUser.name}, just sent an application for ${teamName}! Check out my profile when you have a moment.`,
        read: true,
        createdAt: new Date(now - (25 - t) * 1800000).toISOString(),
        updatedAt: new Date(now - (25 - t) * 1800000).toISOString(),
      });
      messages.push({
        id: `msg_${6000 + t * 2 + 1}`,
        senderId: leaderUser.id,
        receiverId: applicantUser.id,
        content: `Thanks for reaching out ${applicantUser.name}! Reviewing your skills now, let's connect on Discord.`,
        read: false,
        createdAt: new Date(now - (25 - t) * 900000).toISOString(),
        updatedAt: new Date(now - (25 - t) * 900000).toISOString(),
      });
    }
  }

  // 4. 20 Orphan Listings
  for (let o = 0; o < 20; o++) {
    const orphanUser = users[75 + o];
    const targetEvent = events[o % events.length];
    const skills = [SKILL_POOL[o % SKILL_POOL.length], SKILL_POOL[(o + 5) % SKILL_POOL.length]];

    orphanListings.push({
      id: `orp_${7000 + o}`,
      userId: orphanUser.id,
      targetEventId: targetEvent.id,
      targetCategory: targetEvent.category,
      skills: JSON.stringify(skills),
      experience: "2+ years building full-stack applications & competing in hackathons.",
      availability: "Full 48 hours free, ready to grind over the weekend.",
      location: orphanUser.location,
      mode: targetEvent.mode,
      bio: `Hi, I'm ${orphanUser.name} from ${orphanUser.college}. Looking for an ambitious squad for ${targetEvent.name}!`,
      status: "ACTIVE",
      createdAt: new Date(now - (20 - o) * 3600000).toISOString(),
      updatedAt: new Date(now - (20 - o) * 3600000).toISOString(),
    });
  }

  const fullPayload: Schema = {
    users,
    events,
    teams,
    teamMembers,
    orphanListings,
    joinRequests,
    notifications,
    messages,
    reports: [],
  };

  const ok = await db.saveAll(fullPayload);

  return {
    success: ok,
    counts: {
      users: users.length,
      events: events.length,
      teams: teams.length,
      teamMembers: teamMembers.length,
      orphanListings: orphanListings.length,
      joinRequests: joinRequests.length,
      notifications: notifications.length,
      messages: messages.length,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const result = await runSeed();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await runSeed();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
