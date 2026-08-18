import "server-only";

import { hkdfSync } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "portal_session";
const SESSION_DURATION = "30d";

// A distinct cookie AND a distinct signing key from the internal staff
// session (src/lib/auth/session.ts) — derived from the same required
// SESSION_SECRET via HKDF with its own "info" label (same technique as
// src/lib/email-crypto.ts), so a client-portal login needs no separate
// secret to provision, but its tokens can never verify against the
// internal session's key or vice versa, even if the two were ever
// compared by mistake.
function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new Uint8Array(hkdfSync("sha256", secret, "", "gotech-crm:portal-session", 32));
}

type PortalSessionPayload = { clientUserId: string };

async function encrypt(payload: PortalSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function decryptPortalSession(token: string | undefined): Promise<PortalSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<PortalSessionPayload>(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.clientUserId) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createPortalSession(clientUserId: string) {
  const token = await encrypt({ clientUserId });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
}

export async function deletePortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getPortalSessionPayload(): Promise<PortalSessionPayload | null> {
  const cookieStore = await cookies();
  return decryptPortalSession(cookieStore.get(COOKIE_NAME)?.value);
}
