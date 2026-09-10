import { NextResponse, type NextRequest } from "next/server";
import { findPartnerByReferralCode, logReferralClick } from "@/lib/referrals";
import { getReferralSettings } from "@/lib/settings";

// A partner's plain referral link, from the business portal's overview:
// /r/<code>. Logs the visit as a ReferralClick and 302s to the marketing
// landing page with ?ref=<code> appended, where the lead-capture widget
// picks the code up and sends it back with any submission (see
// public/embed/lead-form.js). Going through the CRM first, rather than
// linking to the landing page with ?ref= directly, is what makes "clicks"
// countable at all — the landing page is someone else's site. Public (see
// src/proxy.ts): the visitor is a stranger, not a user.
//
// A "Recommend this business" link is a different route entirely — see
// src/app/[locale]/directory/[slug]/r/[code]/route.ts — since it needs to
// land on that specific listing rather than the marketing site.
//
// An unknown code still redirects, just without ?ref= — the visitor did
// nothing wrong and shouldn't land on an error page for a partner's typo.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [partner, settings] = await Promise.all([findPartnerByReferralCode(code), getReferralSettings()]);

  const target = new URL(settings.landingUrl);
  if (partner) {
    target.searchParams.set("ref", code.trim().toLowerCase());
    await logReferralClick(request, partner.id, null);
  }

  return NextResponse.redirect(target, 302);
}
