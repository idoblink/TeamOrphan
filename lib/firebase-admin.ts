// lib/firebase-admin.ts
// Server-side Firebase Admin SDK (used in API routes and server components)
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;

function initAdmin(): Firestore {
  if (getApps().length === 0) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (rawServiceAccount) {
      try {
        let jsonStr = rawServiceAccount.trim();
        // If it was base64 encoded
        if (!jsonStr.startsWith("{")) {
          jsonStr = Buffer.from(jsonStr, "base64").toString("utf8");
        }
        const serviceAccount = JSON.parse(jsonStr);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
      } catch (e) {
        console.error("FIREBASE_SERVICE_ACCOUNT_JSON parse error:", e);
      }
    }

    if (!adminApp) {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        // Strip surrounding quotes if present
        privateKey = privateKey.replace(/^["']|["']$/g, "");
        // Replace escaped \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^["']|["']$/g, "");
      const projectId = process.env.FIREBASE_PROJECT_ID?.replace(/^["']|["']$/g, "");

      if (
        privateKey &&
        !privateKey.includes("YOUR_KEY_HERE") &&
        clientEmail &&
        !clientEmail.includes("xxxxx")
      ) {
        try {
          adminApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            projectId,
          });
        } catch (e) {
          console.error("Firebase Admin cert error:", e);
        }
      }
    }

    if (!adminApp) {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "teamsync-b506a",
      });
    }
  } else {
    adminApp = getApps()[0];
  }

  return getFirestore(adminApp);
}

declare global {
  // eslint-disable-next-line no-var
  var _adminDb: Firestore | undefined;
}

export const adminDb: Firestore =
  global._adminDb || (global._adminDb = initAdmin());
