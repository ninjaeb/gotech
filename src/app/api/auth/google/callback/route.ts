import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { exchangeGoogleCode, isGoogleAuthConfigured, verifyGoogleIdToken, verifyGoogleOAuthState } from "@/lib/auth/google";
import { hashPassword } from "@/lib/auth/password";
import { createBusinessSession } from "@/lib/business/session";
import { PARTNER_HOME } from "@/lib/auth/dal";
import { registerOrSignInPartnerWithGoogle } from "@/lib/partner-signup";
import { getSiteOrigin } from "@/lib/site-url";

const STATE_COOKIE = "google_oauth_state";

// `request.url`/`request.nextUrl` reflect the request as cPanel's proxy
// forwards it to the Node process it's bound to (http://localhost:3000/...)
// — not the public domain the visitor actually used. getSiteOrigin() reads
// the X-Forwarded-Host/-Proto headers that proxy sets instead (see
// src/lib/site-url.ts), the same header-based origin already used a few
// lines below to build the redirect_uri sent to Google itself — every
// redirect back to the browser here needs to use that same origin, or the
// visitor ends up bounced to a URL only the server itself can reach.
function failure(siteOrigin: string, code: string, returnTo: "signup" | "login" = "signup") {
  const path = returnTo === "login" ? "/business/login" : "/directory/signup";
  const url = new URL(path, siteOrigin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const siteOrigin = await getSiteOrigin();

  if (!isGoogleAuthConfigured()) {
    return failure(siteOrigin, "google_unavailable");
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !stateParam || !storedState || stateParam !== storedState) {
    const res = failure(siteOrigin, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const state = await verifyGoogleOAuthState(stateParam);
  if (!state) {
    const res = failure(siteOrigin, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const redirectUri = `${siteOrigin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const profile = await verifyGoogleIdToken(tokens.id_token);
    if (!profile.emailVerified) {
      const res = failure(siteOrigin, "email_unverified", state.returnTo);
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

    if (!result.ok) {
      const res = failure(siteOrigin, result.error, state.returnTo);
      res.cookies.delete(STATE_COOKIE);
      return res;
    }

    await createBusinessSession(result.userId);
    const res = NextResponse.redirect(new URL(PARTNER_HOME, siteOrigin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    const res = failure(siteOrigin, "google_failed", state.returnTo);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
