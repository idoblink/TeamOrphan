import fs from "fs";
import path from "path";
import os from "os";

// Zero-config database (TinyDB)
// On Vercel / serverless functions, the root is read-only so we use os.tmpdir().
// In local dev, it stores in .data/db.json inside the project root.
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "teamsync-data")
  : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface Schema {
  users: any[];
  events: any[];
  teams: any[];
  teamMembers: any[];
  orphanListings: any[];
  joinRequests: any[];
  notifications: any[];
  messages: any[];
  reports: any[];
}

const defaultData: Schema = {
  users: [
    {
      id: "usr_alex",
      name: "Alex Vance",
      username: "alex_v",
      email: "alex@example.com",
      passwordHash: "$2a$10$wEkgzWc8Gq8uSjM0o75f9eeQZ0m1yWc1/fUfIekj1mEvs4uD6Z58O", // password123
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
      college: "BMS College of Engineering",
      location: "Bangalore, India",
      bio: "Full-Stack TypeScript wizard. Fast typer, sleepless hacker.",
      skills: JSON.stringify(["Next.js", "TypeScript", "Node.js", "Tailwind", "Python"]),
      interests: JSON.stringify(["Hackathons", "Startups"]),
      role: "USER",
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "usr_marcus",
      name: "Marcus Chen",
      username: "marcus_c",
      email: "marcus@example.com",
      passwordHash: "$2a$10$wEkgzWc8Gq8uSjM0o75f9eeQZ0m1yWc1/fUfIekj1mEvs4uD6Z58O", // password123
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      college: "Institute of Technology",
      location: "Bangalore, India",
      bio: "AI/ML & Full-Stack student. Passionate about building fast prototypes.",
      skills: JSON.stringify(["Python", "React", "Machine Learning", "Next.js"]),
      interests: JSON.stringify(["Hackathons", "AI"]),
      role: "USER",
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "usr_admin",
      name: "Admin Moderator",
      username: "admin",
      email: "admin@teamsync.org",
      passwordHash: "$2a$10$wEkgzWc8Gq8uSjM0o75f9eeQZ0m1yWc1/fUfIekj1mEvs4uD6Z58O", // password123
      college: "TeamSync HQ",
      location: "Global",
      bio: "Platform safety and team matching coordinator.",
      skills: JSON.stringify(["Moderation", "Full-Stack"]),
      interests: JSON.stringify(["Safety"]),
      role: "ADMIN",
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  events: [
    {
      id: "evt_codeverse",
      name: "CodeVerse 48-Hour National Hackathon",
      description: "India's premier 48-hour student hackathon focusing on AI agents, fintech, and web3 innovation.",
      category: "Hackathon",
      startDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // 36h from now -> URGENT (<24h to cutoff)
      location: "Bangalore & Online",
      mode: "HYBRID",
      createdById: "usr_alex",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "evt_robowars",
      name: "RoboWars 2026 Arena Tournament",
      description: "Heavyweight battle bots and autonomous drone obstacle navigation championship.",
      category: "Robotics",
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Mysore Exhibition Grounds",
      mode: "OFFLINE",
      createdById: "usr_marcus",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  teams: [
    {
      id: "team_neural",
      name: "Neural Ninjas Squad",
      eventId: "evt_codeverse",
      creatorId: "usr_alex",
      maxMembers: 4,
      description: "Building an AI legal doc analyzer. Frontend and backend locked, urgently seeking ML / Python engineer before cutoff!",
      requiredSkills: JSON.stringify(["Python", "Machine Learning", "FastAPI"]),
      preferredSkills: JSON.stringify(["PyTorch", "Next.js"]),
      status: "OPEN",
      contactInfo: "alex@neuralninjas.dev",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  teamMembers: [
    {
      id: "tm_1",
      teamId: "team_neural",
      userId: "usr_alex",
      role: "LEADER",
      joinedAt: new Date().toISOString(),
    },
    {
      id: "tm_2",
      teamId: "team_neural",
      userId: "usr_marcus",
      role: "MEMBER",
      joinedAt: new Date().toISOString(),
    },
  ],
  orphanListings: [
    {
      id: "orph_1",
      userId: "usr_marcus",
      targetEventId: "evt_codeverse",
      targetCategory: "Hackathon",
      skills: JSON.stringify(["Python", "Machine Learning", "Next.js"]),
      experience: "Built 3 full-stack prototypes and won 2 university hackathons.",
      availability: "Available full 48 hours for remote or hybrid squads.",
      location: "Bangalore, India",
      mode: "ANY",
      bio: "ML and React developer ready to contribute to winning squads.",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  joinRequests: [],
  notifications: [
    {
      id: "notif_1",
      userId: "usr_alex",
      type: "SYSTEM",
      title: "Welcome to TeamSync!",
      message: "Your account is active. Manage your squad listings or recruit free agents.",
      link: "/dashboard",
      read: false,
      createdAt: new Date().toISOString(),
    },
  ],
  messages: [],
  reports: [],
};

class TinyDatabase {
  private cache: Schema | null = null;

  private ensureDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignore directory creation errors in locked/restricted serverless runtimes
    }
  }

  private read(): Schema {
    if (this.cache) return this.cache;
    this.ensureDir();
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf8");
        this.cache = JSON.parse(content);
        return this.cache!;
      }
    } catch {
      // Fallback to default
    }
    // Deep clone default data so mutations don't corrupt the template
    this.cache = JSON.parse(JSON.stringify(defaultData));
    this.write(this.cache!);
    return this.cache!;
  }

  private write(data: Schema) {
    this.cache = data;
    try {
      this.ensureDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch {
      // In-memory cache ensures operation succeeds even if storage is strictly transient
    }
  }

  collection<K extends keyof Schema>(table: K) {
    const self = this;
    return {
      findMany(predicate?: (item: Schema[K][number]) => boolean) {
        const data = self.read()[table];
        return predicate ? data.filter(predicate) : [...data];
      },
      findUnique(predicate: (item: Schema[K][number]) => boolean) {
        const data = self.read()[table];
        return data.find(predicate) || null;
      },
      findFirst(predicate: (item: Schema[K][number]) => boolean) {
        const data = self.read()[table];
        return data.find(predicate) || null;
      },
      count(predicate?: (item: Schema[K][number]) => boolean) {
        const data = self.read()[table];
        return predicate ? data.filter(predicate).length : data.length;
      },
      insert(record: any) {
        const fullData = self.read();
        const id = record.id || `${table.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const newRecord = {
          id,
          createdAt: now,
          updatedAt: now,
          ...record,
        };
        fullData[table].push(newRecord);
        self.write(fullData);
        return newRecord;
      },
      update(id: string, updates: Partial<Schema[K][number]>) {
        const fullData = self.read();
        const idx = fullData[table].findIndex((item: any) => item.id === id);
        if (idx === -1) return null;
        fullData[table][idx] = {
          ...fullData[table][idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        self.write(fullData);
        return fullData[table][idx];
      },
      updateMany(predicate: (item: Schema[K][number]) => boolean, updates: Partial<Schema[K][number]>) {
        const fullData = self.read();
        let count = 0;
        fullData[table] = fullData[table].map((item: any) => {
          if (predicate(item)) {
            count++;
            return { ...item, ...updates, updatedAt: new Date().toISOString() };
          }
          return item;
        });
        self.write(fullData);
        return count;
      },
      delete(id: string) {
        const fullData = self.read();
        const idx = fullData[table].findIndex((item: any) => item.id === id);
        if (idx === -1) return false;
        fullData[table].splice(idx, 1);
        self.write(fullData);
        return true;
      },
      deleteMany(predicate: (item: Schema[K][number]) => boolean) {
        const fullData = self.read();
        fullData[table] = fullData[table].filter((item: any) => !predicate(item));
        self.write(fullData);
        return true;
      },
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _tinydb: TinyDatabase | undefined;
}

export const tinydb = global._tinydb || (global._tinydb = new TinyDatabase());
export default tinydb;

