import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildGoogleAuthUrl, isGoogleAuthConfigured, signGoogleOAuthState } from "@/lib/auth/google";
import { getSiteOrigin } from "@/lib/site-url";

const STATE_COOKIE = "google_oauth_state";

// Kicked off by the "Continue with Google" button on either the business-
// directory signup page or the business portal's own login page (both are
// same-origin form POSTs, not links, so whatever the visitor already typed
// on the signup form — company name, phone — travels along as form fields
// rather than being lost across the full-page redirect to Google).
export async function POST(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return new NextResponse("Google sign-in is not configured.", { status: 501 });
  }

  const formData = await request.formData();
  const companyName = String(formData.get("companyName") || "").trim() || undefined;
  const contactName = String(formData.get("contactName") || "").trim() || undefined;
  const phone = String(formData.get("phone") || "").trim() || undefined;
  const returnTo = formData.get("returnTo") === "login" ? "login" : "signup";
  const nonce = randomBytes(16).toString("hex");

  const state = await signGoogleOAuthState({ nonce, companyName, contactName, phone, returnTo });
  const siteOrigin = await getSiteOrigin();
  const redirectUri = `${siteOrigin}/api/auth/google/callback`;

  const response = NextResponse.redirect(buildGoogleAuthUrl({ redirectUri, state }));
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
