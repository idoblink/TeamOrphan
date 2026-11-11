import { cookies } from "next/headers";
import { tinydb } from "./tinydb";

const TEAMS_COOKIE = "teamsync_cookie_teams";
const ORPHANS_COOKIE = "teamsync_cookie_orphans";
const REQUESTS_COOKIE = "teamsync_cookie_requests";
const MEMBERS_COOKIE = "teamsync_cookie_members";

function parseCookieData(raw?: string): any[] {
  if (!raw) return [];
  try {
    const jsonStr = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function encodeCookieData(data: any[]): string {
  return Buffer.from(JSON.stringify(data.slice(-20))).toString("base64");
}

export function syncDatabaseFromCookies() {
  try {
    const cookieStore = cookies();

    // 1. Sync Teams
    const teams = parseCookieData(cookieStore.get(TEAMS_COOKIE)?.value);
    for (const t of teams) {
      if (!tinydb.collection("teams").findUnique((item: any) => item.id === t.id)) {
        tinydb.collection("teams").insert(t);
      }
    }

    // 2. Sync Members
    const members = parseCookieData(cookieStore.get(MEMBERS_COOKIE)?.value);
    for (const m of members) {
      if (!tinydb.collection("teamMembers").findUnique((item: any) => item.id === m.id || (item.teamId === m.teamId && item.userId === m.userId))) {
        tinydb.collection("teamMembers").insert(m);
      }
    }

    // 3. Sync Orphans
    const orphans = parseCookieData(cookieStore.get(ORPHANS_COOKIE)?.value);
    for (const o of orphans) {
      if (!tinydb.collection("orphanListings").findUnique((item: any) => item.id === o.id)) {
        tinydb.collection("orphanListings").insert(o);
      }
    }

    // 4. Sync Join Requests
    const requests = parseCookieData(cookieStore.get(REQUESTS_COOKIE)?.value);
    for (const r of requests) {
      const existing = tinydb.collection("joinRequests").findUnique((item: any) => item.id === r.id);
      if (!existing) {
        tinydb.collection("joinRequests").insert(r);
      } else if (existing.status !== r.status) {
        tinydb.collection("joinRequests").update(r.id, { status: r.status });
      }
    }
  } catch {
    // Ignore cookie read failures in environments where cookies are inaccessible
  }
}

export function saveTeamToCookie(team: any) {
  try {
    const cookieStore = cookies();
    const teams = parseCookieData(cookieStore.get(TEAMS_COOKIE)?.value);
    const existingIdx = teams.findIndex((t: any) => t.id === team.id);
    if (existingIdx >= 0) {
      teams[existingIdx] = team;
    } else {
      teams.push(team);
    }
    cookieStore.set(TEAMS_COOKIE, encodeCookieData(teams), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {}
}

export function saveMemberToCookie(member: any) {
  try {
    const cookieStore = cookies();
    const members = parseCookieData(cookieStore.get(MEMBERS_COOKIE)?.value);
    const existingIdx = members.findIndex(
      (m: any) => m.id === member.id || (m.teamId === member.teamId && m.userId === member.userId)
    );
    if (existingIdx >= 0) {
      members[existingIdx] = member;
    } else {
      members.push(member);
    }
    cookieStore.set(MEMBERS_COOKIE, encodeCookieData(members), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {}
}

export function saveOrphanToCookie(orphan: any) {
  try {
    const cookieStore = cookies();
    const orphans = parseCookieData(cookieStore.get(ORPHANS_COOKIE)?.value);
    const existingIdx = orphans.findIndex((o: any) => o.id === orphan.id);
    if (existingIdx >= 0) {
      orphans[existingIdx] = orphan;
    } else {
      orphans.push(orphan);
    }
    cookieStore.set(ORPHANS_COOKIE, encodeCookieData(orphans), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {}
}

export function saveJoinRequestToCookie(request: any) {
  try {
    const cookieStore = cookies();
    const requests = parseCookieData(cookieStore.get(REQUESTS_COOKIE)?.value);
    const existingIdx = requests.findIndex((r: any) => r.id === request.id);
    if (existingIdx >= 0) {
      requests[existingIdx] = request;
    } else {
      requests.push(request);
    }
    cookieStore.set(REQUESTS_COOKIE, encodeCookieData(requests), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } catch {}
}
