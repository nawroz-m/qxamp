import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

let adminApp: ReturnType<typeof initializeApp> | null = null;
let adminDb: ReturnType<typeof getDatabase> | null = null;

function getAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseUrl = process.env.FIREBASE_DATABASE_URL;

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsed as Record<string, unknown>),
        projectId,
        databaseURL: databaseUrl,
      });
      return adminApp;
    } catch {
      adminApp = null;
    }
  }

  if (clientEmail && privateKey && projectId) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL: databaseUrl,
    });
    return adminApp;
  }

  return null;
}

export function getAdminDb() {
  if (adminDb) {
    return adminDb;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  adminDb = getDatabase(app);
  return adminDb;
}
