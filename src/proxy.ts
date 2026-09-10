import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { decryptPortalSession } from "@/lib/portal/session";
import { decryptBusinessSession } from "@/lib/business/session";

// Routes logged-out visitors can reach at all. /business-portal/login is
// handled entirely separately, in proxyBusinessRoute below, since it
// checks a different cookie.
const AUTH_ONLY_PUBLIC_ROUTES = ["/system/login"];
// Routes that stay public even for a logged-in user — e.g. a shared quote
// link, which staff previewing it shouldn't get bounced away from.
// /api/whatsapp/webhook is Meta's server calling in directly (no session
// cookie at all) — its own signature check (src/lib/whatsapp.ts) is what
// authenticates it, not this proxy; /api/deploy/webhook is GitHub's own
// server calling in the same way, authenticated by its own signature check
// (src/lib/webhook-signature.ts) instead. /embed/ and /api/public/lead
// (/subscribe and /api/public/newsletter-subscribe, same reasoning) are
// the embeddable widgets (public/embed/*.js) — called from arbitrary
// third-party marketing sites, so neither the script files nor their API
// endpoints can require a session; without this, both would redirect to
// /system/login instead of serving JS / accepting the cross-origin POST,
// which a <script> tag or CORS preflight can't follow usefully. /r/ is a partner's
// referral link (src/app/r/[code]/route.ts) — followed by strangers, who
// then land on the marketing site, never here. The public partner
// directory lives under its own locale prefix, /en|/zh|/ms/business
// (src/app/[locale]/business, renamed from /directory for a friendlier
// public URL) — browsed and its lead form submitted by visitors with no
// login at all. Unrelated to the signed-in partner portal, which lives at
// /business-portal (gated by proxyBusinessRoute below) — the two used to
// share the bare word "business" before the portal moved off it
// specifically to avoid that confusion. The bare /directory and
// locale-prefixed /en|/zh|/ms/directory paths are now just permanent
// redirects into the paths above (src/app/directory/,
// src/app/[locale]/directory/) for old links/bookmarks, but need to stay
// listed here too so *they* aren't blocked from running their own
// redirect logic. The bare /business is the same story on the portal
// side — its own old URL, now just a permanent redirect into
// /business-portal (see src/app/business/) — and needs to stay listed for
// the same reason: it has to run before any session check, since a
// partner following an old link has no `system_session` to satisfy one.
// Safe to match as a plain prefix even though "/business-portal" also
// starts with "/business" — every /business-portal/* request already
// returned via proxyBusinessRoute above before reaching this list at all.
// /api/directory-images/ serves a listing's About-field images, embedded
// on that same public page.
// /api/auth/google is the "Continue with Google" redirect-out-and-back
// (src/app/api/auth/google, .../callback) kicked off from both
// /<locale>/business/signup and /business-portal/login — the visitor has
// no session yet when they click it, so without this prefix the proxy
// would bounce the POST (and Google's own redirect back to the callback)
// to a login page before either request ever reached its handler.
const ALWAYS_PUBLIC_PREFIXES = [
  "/q/",
  "/r/",
  "/lead",
  "/book",
  "/subscribe",
  "/directory",
  "/en/directory",
  "/zh/directory",
  "/ms/directory",
  "/en/business",
  "/zh/business",
  "/ms/business",
  "/business",
  "/testimonial/",
  "/embed/",
  "/unsubscribe/",
  "/api/whatsapp/webhook",
  "/api/deploy/webhook",
  "/api/public/lead",
  "/api/public/newsletter-subscribe",
  "/api/newsletter-images/",
  "/api/directory-images/",
  "/api/auth/google",
];

// The client portal (/portal/*) is a second, independent visitor type with
// its own cookie and signing key (see src/lib/portal/session.ts) — it's
// handled entirely separately, before any of the staff-session logic below,
// so the two auth systems never interact: a staff `system_session` cookie
// can't substitute for a `portal_session` and is never even inspected for
// these paths, and vice versa for every other route.
const PORTAL_AUTH_ONLY_PUBLIC_ROUTES = ["/portal/login"];
const PORTAL_ALWAYS_PUBLIC_PREFIXES = ["/portal/accept-invite/"];

async function proxyPortalRoute(request: NextRequest, pathname: string) {
  const isAuthOnlyPublic = PORTAL_AUTH_ONLY_PUBLIC_ROUTES.includes(pathname);
  const isAlwaysPublic = PORTAL_ALWAYS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const session = await decryptPortalSession(request.cookies.get("portal_session")?.value);

  if (!isAuthOnlyPublic && !isAlwaysPublic && !session?.clientUserId) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  if (isAuthOnlyPublic && session?.clientUserId) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

// The business portal (/business-portal/*) is a third, independent visitor
// type with its own cookie and signing key (see src/lib/business/session.ts),
// handled entirely separately before the staff-session logic below — same
// isolation, same reasoning, as the client portal's own proxyPortalRoute:
// a staff `system_session` cookie can't substitute for a `business_session`
// and is never even inspected for these paths, and vice versa for every
// other route. This is what lets a browser stay signed into /system and
// /business-portal at the same time.
const BUSINESS_AUTH_ONLY_PUBLIC_ROUTES = ["/business-portal/login"];

async function proxyBusinessRoute(request: NextRequest, pathname: string) {
  const isAuthOnlyPublic = BUSINESS_AUTH_ONLY_PUBLIC_ROUTES.includes(pathname);
  const session = await decryptBusinessSession(request.cookies.get("business_session")?.value);

  if (!isAuthOnlyPublic && !session?.userId) {
    return NextResponse.redirect(new URL("/business-portal/login", request.url));
  }

  if (isAuthOnlyPublic && session?.userId) {
    return NextResponse.redirect(new URL("/business-portal", request.url));
  }

  return NextResponse.next();
}

// Mirrors getDirectoryLocale (src/lib/directory-locale.ts) exactly — same
// cookie name/priority, same Accept-Language fallback — but reads off a
// NextRequest directly instead of next/headers' cookies()/headers(), which
// aren't available in middleware. Only used for the bare "/" redirect
// below; every /[locale]/directory/... page resolves its own locale from
// the URL itself once it gets there.
function resolveDirectoryLocaleFromRequest(request: NextRequest): "en" | "zh" | "ms" {
  const cookieValue = request.cookies.get("directory_locale")?.value;
  if (cookieValue === "en" || cookieValue === "zh" || cookieValue === "ms") return cookieValue;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  if (/\bzh\b/i.test(acceptLanguage)) return "zh";
  if (/\bms\b/i.test(acceptLanguage)) return "ms";
  return "en";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The public business directory is the site's front door now — the CRM
  // itself lives at /system (see below), so a bare "/" has nothing of its
  // own to render and always hands off to the directory instead. Resolved
  // straight to a locale-prefixed URL here (same cookie/Accept-Language
  // guess as getDirectoryLocale, reimplemented rather than imported since
  // that one calls next/headers' cookies()/headers(), not available on a
  // NextRequest in middleware) rather than bouncing through the bare
  // /directory redirect stub (src/app/directory/page.tsx) a second time.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${resolveDirectoryLocaleFromRequest(request)}/business`, request.url));
  }

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return proxyPortalRoute(request, pathname);
  }

  if (pathname === "/business-portal" || pathname.startsWith("/business-portal/")) {
    return proxyBusinessRoute(request, pathname);
  }

  const isAuthOnlyPublic = AUTH_ONLY_PUBLIC_ROUTES.includes(pathname);
  const isAlwaysPublic = ALWAYS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicRoute = isAuthOnlyPublic || isAlwaysPublic;
  const session = await decrypt(request.cookies.get("system_session")?.value);

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/system/login", request.url));
  }

  if (isAuthOnlyPublic && session?.userId) {
    return NextResponse.redirect(new URL("/system", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|sitemap.xml|robots.txt).*)",
  ],
};
