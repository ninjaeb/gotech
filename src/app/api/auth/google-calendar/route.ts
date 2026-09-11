import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildGoogleCalendarAuthUrl, isGoogleAuthConfigured, signGoogleCalendarOAuthState } from "@/lib/auth/google";
import { requireStaffAction } from "@/lib/auth/dal";
import { getSiteOrigin } from "@/lib/site-url";

const STATE_COOKIE = "google_calendar_oauth_state";

// Kicked off by the "Connect Google Calendar" button on Settings
// (/system/settings) — a same-origin form POST from an already-authenticated
// staff session, unlike /api/auth/google's own POST above it in the file
// tree, which runs *before* any CRM session exists (that one signs someone
// in; this one links a calendar to whoever's already signed in).
export async function POST() {
  const user = await requireStaffAction();
  if (!isGoogleAuthConfigured()) {
    return new NextResponse("Google isn't configured.", { status: 501 });
  }

  const nonce = randomBytes(16).toString("hex");
  const state = await signGoogleCalendarOAuthState({ nonce, userId: user.id });
  const siteOrigin = await getSiteOrigin();
  const redirectUri = `${siteOrigin}/api/auth/google-calendar/callback`;

  const response = NextResponse.redirect(buildGoogleCalendarAuthUrl({ redirectUri, state }));
  // Compared against the `state` Google hands back — standard OAuth CSRF
  // protection: only a request that started here (and thus set this
  // cookie) can complete the callback.
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
