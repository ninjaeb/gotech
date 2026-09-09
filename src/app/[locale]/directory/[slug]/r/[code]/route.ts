import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DIRECTORY_REFERRAL_COOKIE, DIRECTORY_REFERRAL_COOKIE_MAX_AGE, findPartnerByReferralCode, logReferralClick } from "@/lib/referrals";
import { getSiteOrigin } from "@/lib/site-url";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DEFAULT_DIRECTORY_LOCALE, directoryHomePath, directoryListingPath } from "@/lib/directory-i18n";

// A "Recommend this business" link — /<locale>/directory/<slug>/r/<code>,
// built by directoryReferralUrl (src/lib/referrals.ts) — the listing's own
// canonical URL plus one more segment, so the link reads like part of the
// site (business name included) rather than an opaque tracking path like
// the plain /r/<code> marketing link (src/app/r/[code]/route.ts) uses.
//
// Logs a ReferralClick against this listing, drops a directory_ref cookie,
// and 302s to the listing page itself; submitDirectoryLead reads that
// cookie back so an inquiry sent from there is credited to the
// recommender. A partner can't earn credit recommending their own listing.
//
// An unknown code, or a listing that isn't live, still redirects — to the
// listing (untracked) or the directory home, respectively — the visitor
// did nothing wrong and shouldn't land on an error page for a stale or
// mistyped link.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string; code: string }> },
) {
  const { locale: rawLocale, slug, code } = await params;
  const locale = resolveDirectoryLocale(rawLocale) ?? DEFAULT_DIRECTORY_LOCALE;
  const siteOrigin = await getSiteOrigin();

  const listing = await db.partnerListing.findUnique({
    where: { slug },
    select: { id: true, partnerId: true, publishedSnapshot: true },
  });
  if (!listing?.publishedSnapshot) {
    return NextResponse.redirect(new URL(directoryHomePath(locale), siteOrigin), 302);
  }

  const response = NextResponse.redirect(new URL(directoryListingPath(locale, slug), siteOrigin), 302);
  const partner = await findPartnerByReferralCode(code);
  if (partner && partner.id !== listing.partnerId) {
    await logReferralClick(request, partner.id, listing.id);
    response.cookies.set(DIRECTORY_REFERRAL_COOKIE, code.trim().toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: DIRECTORY_REFERRAL_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
