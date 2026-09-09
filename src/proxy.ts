import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { decryptPortalSession } from "@/lib/portal/session";

// Routes logged-out visitors can reach at all.
const AUTH_ONLY_PUBLIC_ROUTES = ["/login"];
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
// /login instead of serving JS / accepting the cross-origin POST, which a
// <script> tag or CORS preflight can't follow usefully. /r/ is a partner's
// referral link (src/app/r/[code]/route.ts) — followed by strangers, who
// then land on the marketing site, never here. /directory is the public
// partner directory (src/app/directory) — browsed and its lead form
// submitted by visitors with no login at all. /api/directory-images/ serves
// a listing's About-field images, embedded on that same public page.
const ALWAYS_PUBLIC_PREFIXES = [
  "/q/",
  "/r/",
  "/lead",
  "/book",
  "/subscribe",
  "/directory",
  "/testimonial/",
  "/embed/",
  "/unsubscribe/",
  "/api/whatsapp/webhook",
  "/api/deploy/webhook",
  "/api/public/lead",
  "/api/public/newsletter-subscribe",
  "/api/newsletter-images/",
  "/api/directory-images/",
];

// The client portal (/portal/*) is a second, independent visitor type with
// its own cookie and signing key (see src/lib/portal/session.ts) — it's
// handled entirely separately, before any of the staff-session logic below,
// so the two auth systems never interact: a staff `session` cookie can't
// substitute for a `portal_session` and is never even inspected for these
// paths, and vice versa for every other route.
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return proxyPortalRoute(request, pathname);
  }

  const isAuthOnlyPublic = AUTH_ONLY_PUBLIC_ROUTES.includes(pathname);
  const isAlwaysPublic = ALWAYS_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicRoute = isAuthOnlyPublic || isAlwaysPublic;
  const session = await decrypt(request.cookies.get("session")?.value);

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthOnlyPublic && session?.userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|sitemap.xml|robots.txt).*)",
  ],
};
