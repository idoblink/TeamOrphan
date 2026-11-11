import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./redis";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "teamsync_super_secret_jwt_key_2026_neo_brutalism"
);

const COOKIE_NAME = "teamsync_session";
const ACCOUNTS_COOKIE = "teamsync_accounts";

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
  name?: string;
  role: string;
  avatar?: string | null;
  bio?: string | null;
  college?: string | null;
  location?: string | null;
  skills?: string;
  interests?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getRegisteredAccounts(): Promise<any[]> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(ACCOUNTS_COOKIE)?.value;
    if (!raw) return [];
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAccountToRegistry(account: any) {
  try {
    const accounts = await getRegisteredAccounts();
    const existingIdx = accounts.findIndex(
      (a: any) =>
        a.id === account.id ||
        a.email?.toLowerCase() === account.email?.toLowerCase() ||
        a.username?.toLowerCase() === account.username?.toLowerCase()
    );
    if (existingIdx >= 0) {
      accounts[existingIdx] = account;
    } else {
      accounts.push(account);
    }
    const cookieStore = cookies();
    cookieStore.set(ACCOUNTS_COOKIE, Buffer.from(JSON.stringify(accounts)).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  } catch (e) {
    console.error("Failed to save account to registry:", e);
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    await db.sync();
    let user = db.collection("users").findUnique((u: any) => u.id === payload.userId);

    // Re-hydrate registered user into Redis if new serverless instance
    if (!user) {
      user = db.collection("users").insert({
        id: payload.userId,
        name: payload.name || payload.username,
        email: payload.email,
        username: payload.username,
        role: payload.role || "USER",
        avatar: payload.avatar || null,
        bio: payload.bio || null,
        college: payload.college || null,
        location: payload.location || null,
        skills: payload.skills || JSON.stringify([]),
        interests: payload.interests || JSON.stringify([]),
        passwordHash: "",
        isSuspended: false,
      });
      await db.persist();
    }

    if (user.isSuspended) return null;
    return user;
  } catch {
    return null;
  }
}
