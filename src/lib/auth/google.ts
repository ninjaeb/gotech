import "server-only";

import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

// "Sign in / up with Google" for the public business-directory signup only
// (see src/app/directory/signup) — the staff /login form stays
// email+password, unrelated to this. Deliberately not next-auth: this repo
// has no auth library at all (see src/lib/auth/session.ts's own hand-rolled
// jose-signed cookie), so this follows the same minimal, dependency-free
// shape rather than pulling one in for a single provider.

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Optional, same spirit as OPENROUTER_API_KEY — the signup page hides the
// "Continue with Google" button (and this route refuses to start the flow)
// when these aren't set, rather than erroring at request time.
export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

// Reuses SESSION_SECRET rather than adding a new required env var — this
// signs a short-lived, server-only token (the OAuth "state" round-tripped
// through Google), not a login session itself, but the same secret is a
// fine signing key for both.
function getStateSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

// Carries whatever the signup form already had filled in across the full-
// page redirect to Google and back (React state doesn't survive that trip).
// `nonce` also doubles as the CSRF value compared against the httpOnly
// cookie set alongside it in the /api/auth/google route.
export type GoogleOAuthState = {
  nonce: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
};

export async function signGoogleOAuthState(state: GoogleOAuthState): Promise<string> {
  return new SignJWT(state)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getStateSecretKey());
}

export async function verifyGoogleOAuthState(token: string): Promise<GoogleOAuthState | null> {
  try {
    const { payload } = await jwtVerify<GoogleOAuthState>(token, getStateSecretKey(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ id_token: string }> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }
  return response.json();
}

export type GoogleProfile = { email: string; emailVerified: boolean; name: string };

// Verifies the id_token's signature against Google's own published keys
// (rotated on their end, hence the remote/cached JWKS rather than a pinned
// key) and its issuer/audience — this is what actually proves the visitor
// controls that email address, not just that they clicked a button.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) throw new Error("Google account has no email");
  return {
    email,
    emailVerified: payload.email_verified !== false,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email,
  };
}
