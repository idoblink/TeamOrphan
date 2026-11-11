// Pure Redis NoSQL Database Client for TeamSync
// Uses Upstash Redis / Vercel KV REST API. Zero dependencies on local files, TinyDB, or Firestore.

const REDIS_URL =
  process.env.STORAGE_REST_API_URL ||
  process.env.STORAGE_REDIS_REST_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  "https://major-deer-197354.upstash.io";

const REDIS_TOKEN =
  process.env.STORAGE_REST_API_TOKEN ||
  process.env.STORAGE_REDIS_REST_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  "gQAAAAAAAwLqAQIgcDFiN2ZiNjlhMmUzZjg0MzVjOWM0MzZjNDlkOGUwMjkxOA";

const REDIS_KEY = "teamsync_nosql_state";

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

export const defaultData: Schema = {
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

interface GlobalRedisState {
  __teamsync_redis_cache?: Schema;
  __teamsync_redis_last_sync?: number;
  __teamsync_redis_sync_promise?: Promise<Schema> | null;
  __teamsync_redis_persist_promise?: Promise<boolean> | null;
}

const globalRef = globalThis as unknown as GlobalRedisState;

class RedisDatabase {
  // Synchronous read from in-memory cache
  public read(): Schema {
    if (globalRef.__teamsync_redis_cache) {
      return globalRef.__teamsync_redis_cache;
    }
    const fresh = JSON.parse(JSON.stringify(defaultData));
    globalRef.__teamsync_redis_cache = fresh;
    return fresh;
  }

  // Synchronize state from Redis NoSQL store
  public async sync(force = false): Promise<Schema> {
    const now = Date.now();
    const lastSync = globalRef.__teamsync_redis_last_sync || 0;

    if (!force && globalRef.__teamsync_redis_cache && now - lastSync < 1500) {
      return globalRef.__teamsync_redis_cache;
    }

    if (globalRef.__teamsync_redis_sync_promise) {
      return globalRef.__teamsync_redis_sync_promise;
    }

    globalRef.__teamsync_redis_sync_promise = (async () => {
      try {
        const res = await fetch(REDIS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REDIS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(["GET", REDIS_KEY]),
          cache: "no-store",
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          const doc = await res.json();
          const raw = doc.result;
          if (raw) {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            const merged: Schema = {
              users: Array.isArray(parsed.users) ? parsed.users : [],
              events:
                Array.isArray(parsed.events) && parsed.events.length > 0
                  ? parsed.events
                  : defaultData.events,
              teams: Array.isArray(parsed.teams) ? parsed.teams : [],
              teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : [],
              orphanListings: Array.isArray(parsed.orphanListings) ? parsed.orphanListings : [],
              joinRequests: Array.isArray(parsed.joinRequests) ? parsed.joinRequests : [],
              notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
              messages: Array.isArray(parsed.messages) ? parsed.messages : [],
              reports: Array.isArray(parsed.reports) ? parsed.reports : [],
            };

            globalRef.__teamsync_redis_cache = merged;
            globalRef.__teamsync_redis_last_sync = Date.now();
            return merged;
          }
        }
      } catch (err) {
        console.warn("Redis sync fallback:", err);
      }

      return this.read();
    })().finally(() => {
      globalRef.__teamsync_redis_sync_promise = null;
    });

    return globalRef.__teamsync_redis_sync_promise;
  }

  // Persist state to Redis NoSQL store
  public async persist(): Promise<boolean> {
    const data = this.read();

    if (globalRef.__teamsync_redis_persist_promise) {
      try {
        await globalRef.__teamsync_redis_persist_promise;
      } catch {}
    }

    globalRef.__teamsync_redis_persist_promise = (async () => {
      try {
        const res = await fetch(REDIS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REDIS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(data)]),
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          globalRef.__teamsync_redis_last_sync = Date.now();
          return true;
        } else {
          console.error("Redis persist failed:", res.status, await res.text());
          return false;
        }
      } catch (err) {
        console.error("Redis persist exception:", err);
        return false;
      }
    })().finally(() => {
      globalRef.__teamsync_redis_persist_promise = null;
    });

    return globalRef.__teamsync_redis_persist_promise;
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
        const id =
          record.id ||
          `${table.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const newRecord = {
          id,
          createdAt: now,
          updatedAt: now,
          ...record,
        };
        fullData[table].push(newRecord);
        globalRef.__teamsync_redis_cache = fullData;
        self.persist().catch(() => {});
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
        globalRef.__teamsync_redis_cache = fullData;
        self.persist().catch(() => {});
        return fullData[table][idx];
      },
      updateMany(
        predicate: (item: Schema[K][number]) => boolean,
        updates: Partial<Schema[K][number]>
      ) {
        const fullData = self.read();
        let count = 0;
        fullData[table] = fullData[table].map((item: any) => {
          if (predicate(item)) {
            count++;
            return { ...item, ...updates, updatedAt: new Date().toISOString() };
          }
          return item;
        });
        globalRef.__teamsync_redis_cache = fullData;
        self.persist().catch(() => {});
        return count;
      },
      delete(id: string) {
        const fullData = self.read();
        const idx = fullData[table].findIndex((item: any) => item.id === id);
        if (idx === -1) return false;
        fullData[table].splice(idx, 1);
        globalRef.__teamsync_redis_cache = fullData;
        self.persist().catch(() => {});
        return true;
      },
      deleteMany(predicate: (item: Schema[K][number]) => boolean) {
        const fullData = self.read();
        fullData[table] = fullData[table].filter((item: any) => !predicate(item));
        globalRef.__teamsync_redis_cache = fullData;
        self.persist().catch(() => {});
        return true;
      },
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _redisDb: RedisDatabase | undefined;
}

export const redisDb = global._redisDb || (global._redisDb = new RedisDatabase());
export const db = redisDb;
export const tinydb = redisDb; // Backwards-compatible alias
export default redisDb;
