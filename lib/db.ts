// lib/db.ts
// Re-export adminDb as the unified `db` import used throughout API routes.
// This replaces the former Prisma singleton.
export { adminDb as db } from "./firebase-admin";
