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

    const sanitizedIdentifierKey = sanitizeIdentifierKey(validation.identifier);
    const indexSnapshot = await db.ref(`identifierIndex/${sanitizedIdentifierKey}`).once("value");
    const indexEntry = indexSnapshot.val() as { uid?: string } | null;
    if (!indexEntry?.uid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const userSnapshot = await db.ref(`users/${indexEntry.uid}`).once("value");
    const userData = userSnapshot.val() as { passwordHash?: string; uid?: string; identifier?: string } | null;
    const passwordMatches = userData?.passwordHash ? await bcrypt.compare(password, userData.passwordHash) : false;
    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const uid = userData?.uid ?? indexEntry.uid;
    const token = createAuthToken({ uid, identifier: userData?.identifier ?? validation.identifier });
    return NextResponse.json({ token, user: { uid, identifier: userData?.identifier ?? validation.identifier } });
  } catch (error) {
    console.error("signin error", error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
