import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/session";

// Routes logged-out visitors can reach at all.
const AUTH_ONLY_PUBLIC_ROUTES = ["/login"];
// Routes that stay public even for a logged-in user — e.g. a shared quote
// link, which staff previewing it shouldn't get bounced away from.
const ALWAYS_PUBLIC_PREFIXES = ["/q/", "/lead"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
