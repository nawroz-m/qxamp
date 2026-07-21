import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeIdentifierKey } from "@/lib/auth-utils";

export type AuthUser = {
  uid: string;
  identifier: string;
};

type UsageRecord = {
  date: string;
  count: number;
};

const memoryUsageStore = new Map<string, UsageRecord>();

export function createAuthToken(user: AuthUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ uid: user.uid, identifier: user.identifier }, secret, {
    expiresIn: "7d",
  });
}

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (typeof payload.uid !== "string" || typeof payload.identifier !== "string") {
      return null;
    }

    return {
      uid: payload.uid,
      identifier: payload.identifier,
    } satisfies AuthUser;
  } catch {
    return null;
  }
}

function getTodayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || request.headers.get("x-real-ip") || "unknown";
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readUsageRecord(ref: { once: (event: "value") => Promise<{ val: () => Record<string, unknown> | null }> } | null, today: string) {
  if (!ref) {
    return { date: today, count: 0 } satisfies UsageRecord;
  }

  const snapshot = await ref.once("value");
  const payload = snapshot.val();
  const apiUsage = payload as Record<string, unknown> | null;
  return {
    date: typeof apiUsage?.date === "string" ? apiUsage.date : today,
    count: Number(apiUsage?.count ?? 0),
  } satisfies UsageRecord;
}

async function writeUsageRecord(ref: { update: (value: Record<string, unknown>) => Promise<void> } | null, record: UsageRecord) {
  if (!ref) {
    return;
  }

  await ref.update({ apiUsage: record });
}

export async function enforceOpenAiLimit(request: NextRequest, user: AuthUser | null) {
  const today = getTodayLabel();
  const db = getAdminDb();

  if (user) {
    const userRef = db?.ref(`users/${user.uid}`) as { once: (event: "value") => Promise<{ val: () => Record<string, unknown> | null }>; update: (value: Record<string, unknown>) => Promise<void> } | null;
    const record = await readUsageRecord(userRef, today);
    const resolved = record.date === today ? record : { date: today, count: 0 };

    if (resolved.count >= 100) {
      return {
        allowed: false,
        status: 429,
        error: "Daily limit of 100 requests reached. Try again tomorrow.",
      } as const;
    }

    const nextRecord = { date: today, count: resolved.count + 1 };
    await writeUsageRecord(userRef, nextRecord);

    return { allowed: true, status: 200 } as const;
  }

  const ipKey = sanitizeIdentifierKey(hashValue(getRequestIp(request)));
  const memoryKey = `anon:${ipKey}`;
  const existing = memoryUsageStore.get(memoryKey);
  const resolved = existing?.date === today ? existing : { date: today, count: 0 };

  if (resolved.count >= 5) {
    return {
      allowed: false,
      status: 429,
      error: "You need to sign in to get more free API calls.",
    } as const;
  }

  const nextRecord = { date: today, count: resolved.count + 1 };
  memoryUsageStore.set(memoryKey, nextRecord);

  if (db) {
    const anonRef = db.ref(`anonUsage/${ipKey}`) as { once: (event: "value") => Promise<{ val: () => Record<string, unknown> | null }>; update: (value: Record<string, unknown>) => Promise<void> };
    const snapshot = await anonRef.once("value");
    const existingDoc = snapshot.val() as { date?: string; count?: number } | null;
    const current = existingDoc?.date === today ? { date: today, count: Number(existingDoc.count ?? 0) } : { date: today, count: 0 };

    if (current.count >= 5) {
      return {
        allowed: false,
        status: 429,
        error: "You need to sign in to get more free API calls.",
      } as const;
    }

    await anonRef.update({ date: today, count: current.count + 1 });
  }

  return { allowed: true, status: 200 } as const;
}
