import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCode,
  isGoogleAuthConfigured,
  verifyGoogleCalendarOAuthState,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { encryptSecret } from "@/lib/google-calendar-crypto";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";

const STATE_COOKIE = "google_calendar_oauth_state";

function failure(siteOrigin: string, code: string) {
  const url = new URL("/system/settings", siteOrigin);
  url.searchParams.set("calendar_error", code);
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

  const state = await verifyGoogleCalendarOAuthState(stateParam);
  if (!state) {
    const res = failure(siteOrigin, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  // The signed state already proves this request started from a POST this
  // same staff user made (its own httpOnly cookie round-tripped it) — this
  // just guards against a stale link being reused from a since-swapped
  // session in the same browser.
  const currentUser = await getCurrentUser();
  if (currentUser.id !== state.userId) {
    const res = failure(siteOrigin, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const redirectUri = `${siteOrigin}/api/auth/google-calendar/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    if (!tokens.refresh_token) {
      // Google only issues a refresh_token on a consent screen it actually
      // showed — omitted here almost always means Google silently skipped
      // re-showing it because this app already has offline access from a
      // previous connection. buildGoogleCalendarAuthUrl always passes
      // prompt=consent specifically to avoid that, but there's nothing to
      // store if it happens anyway — asking the user to try again is the
      // only real recovery.
      const res = failure(siteOrigin, "google_no_refresh_token");
      res.cookies.delete(STATE_COOKIE);
      return res;
    }
    const profile = await verifyGoogleIdToken(tokens.id_token);

    await db.googleCalendarAccount.upsert({
      where: { userId: currentUser.id },
      create: {
        userId: currentUser.id,
        email: profile.email,
        encryptedRefreshToken: encryptSecret(tokens.refresh_token),
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        email: profile.email,
        encryptedRefreshToken: encryptSecret(tokens.refresh_token),
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        lastSyncError: null,
      },
    });

    const res = NextResponse.redirect(new URL("/system/settings?calendar=connected", siteOrigin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    const res = failure(siteOrigin, "google_failed");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
