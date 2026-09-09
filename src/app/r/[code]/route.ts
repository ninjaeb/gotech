import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  DIRECTORY_REFERRAL_COOKIE,
  DIRECTORY_REFERRAL_COOKIE_MAX_AGE,
  findPartnerByReferralCode,
} from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";
import { firstHopValue, getSiteOrigin } from "@/lib/site-url";
import { resolveDirectoryLocale } from "@/lib/directory-locale";
import { DEFAULT_DIRECTORY_LOCALE, directoryListingPath } from "@/lib/directory-i18n";

// Same shape PartnerListing.slug is generated in (see generateListingSlug
// in src/lib/directory.ts) — anything else in ?l= is ignored outright
// rather than looked up, so this can never be steered at an arbitrary
// path.
const LISTING_SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;

// A partner's share link: /r/<code>. Two flavours:
//
//   /r/<code>            → the plain referral link from the business
//                          portal's overview. Logs a ReferralClick and
//                          302s to the marketing landing page with
//                          ?ref=<code> appended, where the lead-capture
//                          widget picks the code up and sends it back
//                          with any submission (see public/embed/
//                          lead-form.js).
//   /r/<code>?l=<slug>   → a "Recommend" link for one specific directory
//                          listing (see RecommendButton on the listing
//                          page). Logs the click against that listing,
//                          drops a directory_ref cookie, and 302s to the
//                          listing itself — submitDirectoryLead reads the
//                          cookie back so an inquiry sent from that page
//                          is credited to the recommender. A partner can't
//                          earn credit for recommending their own listing.
//
// Going through the CRM first, rather than linking to the destination
// with ?ref= directly, is what makes "clicks" countable at all. Public
// (see src/proxy.ts): the visitor is a stranger, not a user.
//
// An unknown code still redirects, just without any tracking — the
// visitor did nothing wrong and shouldn't land on an error page for a
// partner's typo.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toLowerCase();
  const partner = await findPartnerByReferralCode(code);

  const rawSlug = request.nextUrl.searchParams.get("l");
  const slug = rawSlug && LISTING_SLUG_PATTERN.test(rawSlug) ? rawSlug : null;
  if (slug) {
    const listing = await db.partnerListing.findUnique({
      where: { slug },
      select: { id: true, partnerId: true, publishedSnapshot: true },
    });
    // Only a live listing is worth landing on; an unpublished or deleted
    // one falls through to the marketing page below, same as no ?l= at all.
    if (listing?.publishedSnapshot) {
      const locale = resolveDirectoryLocale(request.nextUrl.searchParams.get("lang") ?? "") ?? DEFAULT_DIRECTORY_LOCALE;
      const siteOrigin = await getSiteOrigin();
      const response = NextResponse.redirect(new URL(directoryListingPath(locale, slug), siteOrigin), 302);
      if (partner && partner.id !== listing.partnerId) {
        await logClick(request, partner.id, listing.id);
        response.cookies.set(DIRECTORY_REFERRAL_COOKIE, normalizedCode, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: DIRECTORY_REFERRAL_COOKIE_MAX_AGE,
          path: "/",
        });
      }
      return response;
    }
  }

  const settings = await getReferralSettings();
  const target = new URL(settings.landingUrl);
  if (partner) {
    target.searchParams.set("ref", normalizedCode);
    await logClick(request, partner.id, null);
  }
  return NextResponse.redirect(target, 302);
}

// A one-way hash of the IP, never the address itself — enough to
// approximate unique visitors later without holding PII. Best-effort: a
// logging failure must never turn into a broken link for the visitor.
async function logClick(request: NextRequest, partnerId: string, listingId: string | null) {
  const ip = firstHopValue(request.headers.get("x-forwarded-for"));
  await db.referralClick
    .create({
      data: {
        partnerId,
        listingId,
        ipHash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null,
        userAgent: request.headers.get("user-agent")?.slice(0, 191) ?? null,
        referer: request.headers.get("referer")?.slice(0, 191) ?? null,
      },
    })
    .catch((error) => console.error("Failed to log referral click:", error));
}
