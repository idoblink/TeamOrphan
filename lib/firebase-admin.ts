// lib/firebase-admin.ts
// Server-side Firebase Admin SDK (used in API routes and server components)
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;

function initAdmin(): Firestore {
  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountJson, "base64").toString("utf8")
        );
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
      } catch (e) {
        console.warn("Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
      }
    }

    if (!adminApp) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_PROJECT_ID;

      // If credentials look like placeholders or are missing (e.g. during next build phase)
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
          console.warn("Firebase Admin cert error:", e);
        }
      }
    }

    if (!adminApp) {
      // Fallback dummy initialization for build time / offline generation
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "teamsync-demo",
      });
    }
  } else {
    adminApp = getApps()[0];
  }

  return getFirestore(adminApp);
}

// Singleton: reuse across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _adminDb: Firestore | undefined;
}

export const adminDb: Firestore =
  global._adminDb || (global._adminDb = initAdmin());
