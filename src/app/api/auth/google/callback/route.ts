import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { exchangeGoogleCode, isGoogleAuthConfigured, verifyGoogleIdToken, verifyGoogleOAuthState } from "@/lib/auth/google";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/dal";
import { registerOrSignInPartnerWithGoogle } from "@/lib/partner-signup";
import { getSiteOrigin } from "@/lib/site-url";
import { db } from "@/lib/db";

const STATE_COOKIE = "google_oauth_state";

function failure(request: NextRequest, code: string) {
  const url = new URL("/directory/signup", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return failure(request, "google_unavailable");
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !stateParam || !storedState || stateParam !== storedState) {
    const res = failure(request, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const state = await verifyGoogleOAuthState(stateParam);
  if (!state) {
    const res = failure(request, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const siteOrigin = await getSiteOrigin();
    const redirectUri = `${siteOrigin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const profile = await verifyGoogleIdToken(tokens.id_token);
    if (!profile.emailVerified) {
      const res = failure(request, "email_unverified");
      res.cookies.delete(STATE_COOKIE);
      return res;
    }

    const contactName = state.contactName || profile.name;
    const companyName = state.companyName || contactName;
    const result = await registerOrSignInPartnerWithGoogle({
      contactName,
      email: profile.email,
      companyName,
      phone: state.phone,
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
    });

    await createSession(result.userId);

    // A returning user matched by email might not be a PARTNER at all
    // (e.g. an admin who happened to sign the form with their own work
    // email) — send them to wherever their own role actually lives rather
    // than assuming the partner portal.
    const user = await db.user.findUniqueOrThrow({ where: { id: result.userId }, select: { role: true } });
    const res = NextResponse.redirect(new URL(homeForRole(user.role), request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    const res = failure(request, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
