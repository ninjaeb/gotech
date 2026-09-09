import "server-only";

import { hkdfSync } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "business_session";
const SESSION_DURATION = "30d";

// A distinct cookie AND a distinct signing key from the staff session
// (src/lib/auth/session.ts) — derived from the same required SESSION_SECRET
// via HKDF with its own "info" label, same technique as the client portal's
// own session (src/lib/portal/session.ts). A partner and a staff member
// (or the same person, signed into both) each keep their own cookie, so
// logging into one never touches the other, and a business_session token
// can never verify against the staff session's key or vice versa.
function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new Uint8Array(hkdfSync("sha256", secret, "", "gotech-crm:business-session", 32));
}

type BusinessSessionPayload = { userId: string };

async function encrypt(payload: BusinessSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function decryptBusinessSession(token: string | undefined): Promise<BusinessSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<BusinessSessionPayload>(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.userId) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createBusinessSession(userId: string) {
  const token = await encrypt({ userId });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    // Site-wide, not scoped to /business — src/app/directory's own header
    // reads this cookie too (to offer "My business" instead of "Login" in
    // its nav menu), same reasoning path: "/" already applies to
    // portal_session despite being portal-scoped.
    path: "/",
  });
}

export async function deleteBusinessSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getBusinessSessionPayload(): Promise<BusinessSessionPayload | null> {
  const cookieStore = await cookies();
  return decryptBusinessSession(cookieStore.get(COOKIE_NAME)?.value);
}
