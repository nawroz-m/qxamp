import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { createAuthToken } from "@/lib/auth-server";
import { sanitizeIdentifierKey, validateIdentifierAndPassword } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = typeof body?.identifier === "string" ? body.identifier : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const validation = validateIdentifierAndPassword(identifier, password);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Authentication service is not configured." }, { status: 500 });
    }

    const normalizedIdentifier = validation.identifier;
    const sanitizedIdentifierKey = sanitizeIdentifierKey(normalizedIdentifier);
    const existingIndexRef = db.ref(`identifierIndex/${sanitizedIdentifierKey}`);
    const existingSnapshot = await existingIndexRef.once("value");
    if (existingSnapshot.exists()) {
      return NextResponse.json({ error: "An account with that identifier already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = db.ref("users").push().key;
    if (!uid) {
      return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
    }

    const createdAt = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    await db.ref().update({
      [`users/${uid}`]: {
        uid,
        identifier: normalizedIdentifier,
        identifierType: validation.identifierType,
        passwordHash,
        createdAt,
        apiUsage: { date: today, count: 0 },
      },
      [`identifierIndex/${sanitizedIdentifierKey}`]: { uid },
    });

    const token = createAuthToken({ uid, identifier: normalizedIdentifier });
    return NextResponse.json({ token, user: { uid, identifier: normalizedIdentifier } });
  } catch (error) {
    console.error("signup error", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
