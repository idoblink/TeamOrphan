import { cookies } from "next/headers";
import { tinydb } from "./tinydb";

// Legacy cookie-based storage shim.
// All persistence is centralized in Redis / TinyDB NoSQL store,
// providing real-time multi-device synchronization without 4KB header limits.

export async function syncDatabaseFromCookies() {
  await tinydb.sync();
  clearLegacyCookies();
}

export function clearLegacyCookies() {
  try {
    const cookieStore = cookies();
    cookieStore.delete("teamsync_cookie_teams");
    cookieStore.delete("teamsync_cookie_orphans");
    cookieStore.delete("teamsync_cookie_requests");
    cookieStore.delete("teamsync_cookie_members");
    cookieStore.delete("teamsync_accounts");
  } catch {
    // In Server Components, cookies cannot be deleted during render; ignore safely
  }
}

export function saveTeamToCookie(_team?: any) {
  // No-op: data is persisted to NoSQL store
}

export function saveMemberToCookie(_member?: any) {
  // No-op: data is persisted to NoSQL store
}

export function saveOrphanToCookie(_orphan?: any) {
  // No-op: data is persisted to NoSQL store
}

export function saveJoinRequestToCookie(_request?: any) {
  // No-op: data is persisted to NoSQL store
}
