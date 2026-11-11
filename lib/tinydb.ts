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
  users: [],
  events: [
    {
      id: "evt_codeverse",
      name: "CodeVerse 2026 National Hackathon",
      description: "India's premier 48-hour student hackathon focusing on AI agents, fintech, and web3 innovation.",
      category: "Hackathon",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Bangalore & Online",
      mode: "HYBRID",
      createdById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "evt_robowars",
      name: "RoboWars 2026 Arena Tournament",
      description: "Heavyweight battle bots and autonomous drone obstacle navigation championship.",
      category: "Robotics",
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Mysore Exhibition Grounds",
      mode: "OFFLINE",
      createdById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "evt_ai_sprint",
      name: "Global AI & Web3 Sprint 2026",
      description: "Collegiate sprint to build open-source decentralized agent frameworks and full-stack solutions.",
      category: "Coding Contest",
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Online",
      mode: "ONLINE",
      createdById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  teams: [],
  teamMembers: [],
  orphanListings: [],
  joinRequests: [],
  notifications: [],
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

